terraform {
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
  }
}

variable "namespace" { type = string }
variable "image" { type = string }
variable "message" { type = string }
variable "config_revision" {
  type = string
  validation {
    condition     = contains(["v1", "v2"], var.config_revision)
    error_message = "This laboratory only implements config revisions v1 and v2."
  }
}
