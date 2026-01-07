variable "name" {
  description = "Name of the bastion host"
  type        = string
  default     = "bastion"
}

variable "vpc_id" {
  description = "VPC ID where the bastion will be created"
  type        = string
}

variable "subnet_id" {
  description = "Public subnet ID for the bastion host"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID (optional, defaults to latest Amazon Linux 2)"
  type        = string
  default     = null
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
}

variable "generate_ssh_key" {
  description = "Whether to generate an SSH key pair"
  type        = bool
  default     = true
}

variable "public_key" {
  description = "Public key content (required if generate_ssh_key is false)"
  type        = string
  default     = null
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to SSH to the bastion"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "user_data" {
  description = "User data script"
  type        = string
  default     = null
}

variable "root_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 8
}

variable "root_volume_type" {
  description = "Type of the root volume"
  type        = string
  default     = "gp3"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
