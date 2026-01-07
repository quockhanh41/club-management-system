data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
  
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "tls_private_key" "this" {
  count = var.generate_ssh_key ? 1 : 0
  
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "this" {
  key_name   = var.key_name
  public_key = var.generate_ssh_key ? tls_private_key.this[0].public_key_openssh : var.public_key
  
  tags = var.tags
}

resource "aws_security_group" "this" {
  name        = "${var.name}-sg"
  description = "Security group for bastion host"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
    description = "SSH access"
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }
  
  tags = merge(
    var.tags,
    { Name = "${var.name}-sg" }
  )
}

resource "aws_instance" "this" {
  ami           = var.ami_id != null ? var.ami_id : data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type
  
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  key_name                    = aws_key_pair.this.key_name
  associate_public_ip_address = true
  
  user_data = var.user_data
  
  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = var.root_volume_type
    delete_on_termination = true
    encrypted             = true
  }
  
  tags = merge(
    var.tags,
    { Name = var.name }
  )
}
