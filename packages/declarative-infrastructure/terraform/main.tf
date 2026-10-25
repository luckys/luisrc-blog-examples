variable "namespace" {
  type = string
  validation {
    condition     = can(regex("^tf-lab-[a-f0-9]{8}$", var.namespace))
    error_message = "Use a unique namespace owned by this local laboratory."
  }
}

variable "image" {
  type = string
}

variable "message" {
  type    = string
  default = "hello-from-terraform"
}

variable "config_revision" {
  type    = string
  default = "v1"
}

resource "kubernetes_namespace_v1" "lab" {
  metadata {
    name   = var.namespace
    labels = { "luisrc-lab" = "declarative-infrastructure" }
  }
}

module "catalogue" {
  source          = "./modules/catalogue"
  namespace       = kubernetes_namespace_v1.lab.metadata[0].name
  image           = var.image
  message         = var.message
  config_revision = var.config_revision
}

output "service_name" {
  value = module.catalogue.service_name
}
