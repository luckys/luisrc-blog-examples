locals {
  name   = "catalogue"
  labels = { app = local.name }
}

resource "kubernetes_config_map_v1" "settings" {
  metadata {
    name      = "${local.name}-${var.config_revision}"
    namespace = var.namespace
    labels    = local.labels
  }
  data = { message = var.message }
  lifecycle { create_before_destroy = true }
}

resource "kubernetes_secret_v1" "example" {
  metadata {
    name      = "catalogue-dummy"
    namespace = var.namespace
  }
  # Public fixture, never a credential. It demonstrates what state can contain.
  data = { credential = "public-lab-fixture-not-a-real-secret" }
}

resource "kubernetes_deployment_v1" "api" {
  metadata {
    name      = local.name
    namespace = var.namespace
  }
  spec {
    replicas = 1
    selector { match_labels = local.labels }
    template {
      metadata { labels = local.labels }
      spec {
        automount_service_account_token = false
        security_context {
          run_as_non_root = true
          run_as_user     = 1000
          fs_group        = 1000
        }
        container {
          name              = "api"
          image             = var.image
          image_pull_policy = "Never"
          port { container_port = 3000 }
          env {
            name = "LAB_CREDENTIAL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.example.metadata[0].name
                key  = "credential"
              }
            }
          }
          volume_mount {
            name       = "settings"
            mount_path = "/config"
            read_only  = true
          }
          resources {
            requests = { cpu = "50m", memory = "32Mi" }
            limits   = { cpu = "250m", memory = "96Mi" }
          }
          startup_probe {
            http_get {
              path = "/live"
              port = 3000
            }
            period_seconds    = 2
            failure_threshold = 30
          }
          readiness_probe {
            http_get {
              path = "/ready"
              port = 3000
            }
            period_seconds = 2
          }
          liveness_probe {
            http_get {
              path = "/live"
              port = 3000
            }
            period_seconds = 5
          }
          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = true
            capabilities { drop = ["ALL"] }
          }
        }
        volume {
          name = "settings"
          config_map { name = kubernetes_config_map_v1.settings.metadata[0].name }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "api" {
  metadata {
    name      = local.name
    namespace = var.namespace
  }
  spec {
    selector = local.labels
    port {
      port        = 80
      target_port = 3000
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_ingress_v1" "api" {
  metadata {
    name      = local.name
    namespace = var.namespace
  }
  spec {
    ingress_class_name = "traefik"
    rule {
      host = "catalogue.lab.test"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service_v1.api.metadata[0].name
              port { number = 80 }
            }
          }
        }
      }
    }
  }
}

output "service_name" {
  value = kubernetes_service_v1.api.metadata[0].name
}
