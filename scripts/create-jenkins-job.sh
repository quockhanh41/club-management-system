#!/bin/bash

# Script to create Jenkins pipeline job via CLI

set -e

JENKINS_URL="${JENKINS_URL:-http://localhost:8080}"
JOB_NAME="${JOB_NAME:-club-management-pipeline}"
GIT_REPO="${GIT_REPO:-https://github.com/YOUR_USERNAME/club-management-system.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "🔧 Creating Jenkins Pipeline Job..."
echo "  Jenkins URL: ${JENKINS_URL}"
echo "  Job Name: ${JOB_NAME}"
echo "  Git Repo: ${GIT_REPO}"
echo "  Branch: ${GIT_BRANCH}"
echo ""

# Create job config XML
cat > /tmp/jenkins-job-config.xml << EOF
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job@2.40">
  <actions/>
  <description>Club Management System CI/CD Pipeline</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <org.jenkinsci.plugins.workflow.job.properties.DisableConcurrentBuildsJobProperty/>
    <org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
      <triggers>
        <hudson.triggers.SCMTrigger>
          <spec>H/5 * * * *</spec>
          <ignorePostCommitHooks>false</ignorePostCommitHooks>
        </hudson.triggers.SCMTrigger>
      </triggers>
    </org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps@2.90">
    <scm class="hudson.plugins.git.GitSCM" plugin="git@4.11.0">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${GIT_REPO}</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/${GIT_BRANCH}</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="list"/>
      <extensions/>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
EOF

echo "📝 Job configuration created at /tmp/jenkins-job-config.xml"
echo ""
echo "To create the job, you have two options:"
echo ""
echo "Option 1: Manual (if you haven't setup Jenkins CLI)"
echo "  1. Go to ${JENKINS_URL}/view/all/newJob"
echo "  2. Enter job name: ${JOB_NAME}"
echo "  3. Select 'Pipeline' and click OK"
echo "  4. Under 'Pipeline' section:"
echo "     - Definition: Pipeline script from SCM"
echo "     - SCM: Git"
echo "     - Repository URL: ${GIT_REPO}"
echo "     - Branch Specifier: */${GIT_BRANCH}"
echo "     - Script Path: Jenkinsfile"
echo "  5. Click Save"
echo ""
echo "Option 2: Using Jenkins CLI (requires authentication)"
echo "  java -jar jenkins-cli.jar -s ${JENKINS_URL} create-job ${JOB_NAME} < /tmp/jenkins-job-config.xml"
echo ""
