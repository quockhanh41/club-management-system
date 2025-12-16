# ==============================================================================
# Bastion Host - For Secure Database Access
# ==============================================================================

# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Automatically generate SSH Key Pair
resource "tls_private_key" "bastion_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "bastion_key_pair" {
  key_name   = "club-ssh-key-generated"
  public_key = tls_private_key.bastion_key.public_key_openssh
}

resource "aws_security_group" "bastion_sg" {
  name        = "club-bastion-sg"
  description = "Allow SSH access"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # In prod, restrict to your IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"
  
  subnet_id                   = module.vpc.public_subnets[0]
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  key_name                    = aws_key_pair.bastion_key_pair.key_name
  associate_public_ip_address = true

  tags = {
    Name = "Club Management Bastion"
  }
}

output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
}

output "private_key_pem" {
  value     = tls_private_key.bastion_key.private_key_pem
  sensitive = true
}
