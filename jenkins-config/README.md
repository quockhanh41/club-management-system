# Jenkins Configuration Files

This directory contains Jenkins Configuration as Code (JCasC) files.

## Files

- **jenkins.yaml**: Main Jenkins configuration
  - Sets number of executors to 0 on controller
  - Configures security and authentication
  - Sets up agent protocols

## Important Notes

### Executor Configuration
The controller is configured with **0 executors** to enforce distributed builds:
```yaml
jenkins:
  numExecutors: 0
  mode: EXCLUSIVE
```

This means:
- ✅ No builds will run on the Jenkins controller
- ✅ All builds must run on agents
- ✅ Better security and stability
- ✅ Follows Jenkins best practices

### Modifying Configuration

After making changes to `jenkins.yaml`:

1. Reload configuration via UI:
   - Go to: `Manage Jenkins` > `Configuration as Code`
   - Click "Reload existing configuration"

2. Or restart Jenkins:
   ```bash
   docker-compose -f docker-compose.jenkins.yml restart jenkins
   ```

### Adding Plugins

To add plugins that should be pre-installed, create a `plugins.txt` file and add to Dockerfile.

### Security

Default admin credentials:
- Username: `admin`
- Password: `admin` (change immediately after first login!)

Set a secure password via environment variable:
```yaml
environment:
  - JENKINS_ADMIN_PASSWORD=your-secure-password
```
