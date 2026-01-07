output "instance_id" {
  description = "ID of the bastion instance"
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "Public IP of the bastion host"
  value       = aws_instance.this.public_ip
}

output "private_ip" {
  description = "Private IP of the bastion host"
  value       = aws_instance.this.private_ip
}

output "security_group_id" {
  description = "ID of the bastion security group"
  value       = aws_security_group.this.id
}

output "private_key_pem" {
  description = "Private key in PEM format (only if generated)"
  value       = var.generate_ssh_key ? tls_private_key.this[0].private_key_pem : null
  sensitive   = true
}

output "ssh_command" {
  description = "SSH command to connect to the bastion"
  value       = "ssh -i <private_key_file> ec2-user@${aws_instance.this.public_ip}"
}
