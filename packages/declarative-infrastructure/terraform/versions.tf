terraform {
  required_version = "= 1.15.3"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "= 3.4.0"
    }
  }
  backend "local" {}
}

provider "kubernetes" {
  config_path = "/work/kubeconfig"
}
