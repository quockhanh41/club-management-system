resource "aws_security_group" "this" {
  name        = var.name
  description = var.description
  vpc_id      = var.vpc_id
  
  tags = merge(
    var.tags,
    { Name = var.name }
  )
}

resource "aws_security_group_rule" "ingress" {
  count = length(var.ingress_rules)
  
  security_group_id = aws_security_group.this.id
  type              = "ingress"
  
  from_port   = var.ingress_rules[count.index].from_port
  to_port     = var.ingress_rules[count.index].to_port
  protocol    = var.ingress_rules[count.index].protocol
  description = try(var.ingress_rules[count.index].description, null)
  
  cidr_blocks              = try(var.ingress_rules[count.index].cidr_blocks, null)
  ipv6_cidr_blocks         = try(var.ingress_rules[count.index].ipv6_cidr_blocks, null)
  source_security_group_id = try(var.ingress_rules[count.index].source_security_group_id, null)
}

resource "aws_security_group_rule" "egress" {
  count = length(var.egress_rules)
  
  security_group_id = aws_security_group.this.id
  type              = "egress"
  
  from_port   = var.egress_rules[count.index].from_port
  to_port     = var.egress_rules[count.index].to_port
  protocol    = var.egress_rules[count.index].protocol
  description = try(var.egress_rules[count.index].description, null)
  
  cidr_blocks              = try(var.egress_rules[count.index].cidr_blocks, null)
  ipv6_cidr_blocks         = try(var.egress_rules[count.index].ipv6_cidr_blocks, null)
  source_security_group_id = try(var.egress_rules[count.index].source_security_group_id, null)
}
