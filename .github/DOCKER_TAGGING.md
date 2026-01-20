# Docker Image Tagging Convention

## Overview
This document describes the Docker image tagging strategy used in this project to distinguish between different environments.

## Tagging Strategy

### Image Naming
All service images follow the pattern: `quockhanh41/club-{service}:{tag}`

Where `{service}` is one of:
- `auth`
- `club`
- `event`
- `image`
- `notify`
- `frontend`

### Tag Types

#### 1. Environment Tags
- **`:staging`** - Staging environment images
  - Built from `develop` branch
  - Used in staging infrastructure
  - May include development dependencies
  
- **`:latest`** - Production environment images
  - Built from `main` branch
  - Used in production infrastructure
  - Production-optimized build

#### 2. Version Tags
- **`:YYYYMMDD-HHMMSS-{sha}`** - Timestamped version tags
  - Format: `20260120-103045-a1b2c3d`
  - Built for every merge to `develop` or `main`
  - Enables rollback to specific versions

## Examples

### Staging Environment
```
quockhanh41/club-auth:staging
quockhanh41/club-auth:20260120-103045-a1b2c3d
```

### Production Environment
```
quockhanh41/club-auth:latest
quockhanh41/club-auth:20260120-150000-x9y8z7w
```

## GitHub Actions Workflow

### Build Process
1. **On push to `develop`**:
   - Builds images with:
     - `:staging` tag
     - `:YYYYMMDD-HHMMSS-{sha}` tag

2. **On push to `main`**:
   - Builds images with:
     - `:latest` tag
     - `:YYYYMMDD-HHMMSS-{sha}` tag

### Implementation
See `.github/workflows/post-merge.yml`:
```yaml
tags: |
  ${{ env.DOCKER_REGISTRY }}/${{ secrets.DOCKER_USERNAME }}/club-${{ matrix.service }}:${{ needs.setup.outputs.image_tag }}
  ${{ env.DOCKER_REGISTRY }}/${{ secrets.DOCKER_USERNAME }}/club-${{ matrix.service }}:${{ needs.setup.outputs.branch == 'develop' && 'staging' || 'latest' }}
```

## Terraform Configuration

### Staging Environment (`terraform/environments/staging/terraform.tfvars`)
```hcl
auth_service_image   = "quockhanh41/club-auth:staging"
club_service_image   = "quockhanh41/club-club:staging"
event_service_image  = "quockhanh41/club-event:staging"
# ... other services
```

### Production Environment (`terraform/environments/production/terraform.tfvars`)
```hcl
auth_service_image   = "quockhanh41/club-auth:latest"
club_service_image   = "quockhanh41/club-club:latest"
event_service_image  = "quockhanh41/club-event:latest"
# ... other services
```

## Benefits

1. **Clear Separation**: Easy to identify which images are for which environment
2. **Version Control**: Can rollback to specific versions using timestamped tags
3. **CI/CD Integration**: Automatic tagging based on branch
4. **No Conflicts**: Staging and production use different images
5. **Debugging**: Easy to verify which version is running in each environment

## Best Practices

1. **Never manually tag images as `:staging` or `:latest`** - Let CI/CD handle this
2. **Use timestamped tags for deployments** when you need specific versions
3. **Keep `:staging` and `:latest` tags updated** via CI/CD pipeline
4. **Test in staging first** before promoting to production

## Updating Images

### Staging Deployment
1. Merge to `develop` branch
2. CI/CD builds and pushes `:staging` tag
3. Deploy to staging (can be automatic or manual)

### Production Deployment  
1. Merge `develop` → `main`
2. CI/CD builds and pushes `:latest` tag
3. Deploy to production (should be manual with approval)

## Troubleshooting

### Issue: Wrong image version deployed
**Solution**: Check which tag is referenced in Terraform and ensure CI/CD pushed the correct tag

### Issue: Image not found
**Solution**: Verify the branch triggered CI/CD correctly and check Docker Hub for the tag

### Issue: Staging using production image
**Solution**: Ensure `terraform.tfvars` references `:staging` tag, not `:latest`
