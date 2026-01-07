resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability
  force_delete         = var.force_delete
  
  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }
  
  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key_arn
  }
  
  tags = var.tags
}

resource "aws_ecr_lifecycle_policy" "this" {
  count = var.lifecycle_policy != null ? 1 : 0
  
  repository = aws_ecr_repository.this.name
  policy     = var.lifecycle_policy
}
