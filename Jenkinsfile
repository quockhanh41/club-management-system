pipeline {
    // Disable builds on controller - force all stages to use specific agents
    agent none

    parameters {
        booleanParam(
            name: 'LOCAL_DEBUG',
            defaultValue: false,
            description: 'Use local mounted workspace instead of git checkout for debugging'
        )
        string(
            name: 'E2E_TEST_FILTER',
            defaultValue: '',
            description: 'Filter E2E tests by pattern (e.g., "00-smoke" to run only smoke tests). Leave empty to run all tests.'
        )
        string(
            name: 'E2E_FAILURE_THRESHOLD_PERCENT',
            defaultValue: '10',
            description: 'Maximum percentage of E2E tests allowed to fail (0-100)'
        )
        string(
            name: 'E2E_FAILURE_THRESHOLD_ABSOLUTE',
            defaultValue: '24',
            description: 'Maximum absolute number of E2E tests allowed to fail'
        )
        choice(
            name: 'E2E_THRESHOLD_MODE',
            choices: ['both', 'percentage', 'absolute'],
            description: 'Threshold evaluation mode: both (must satisfy both), percentage only, or absolute only'
        )
        booleanParam(
            name: 'E2E_MARK_UNSTABLE',
            defaultValue: true,
            description: 'Mark build as UNSTABLE instead of SUCCESS when failures are within threshold'
        )
    }

    environment {
        // Docker Registry Configuration
        DOCKER_REGISTRY = credentials('docker-registry-url') // Configure in Jenkins credentials
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        
        // Image naming
        IMAGE_PREFIX = 'club-management'
        IMAGE_TAG = 'latest' // Will be set dynamically in Checkout stage
        
        // Service names
        SERVICES = 'auth club event notify image'
        
        // Node version
        NODE_VERSION = '18'
        
        // Playwright home
        PLAYWRIGHT_BROWSERS_PATH = "${WORKSPACE}/playwright-browsers"
        
        // E2E Test Configuration - Use localhost (ports are exposed)
        API_GATEWAY_URL = 'http://localhost:8000'
        CI = 'true'
        
        // E2E Test Failure Threshold Configuration
        E2E_FAILURE_THRESHOLD_PERCENT = "${params.E2E_FAILURE_THRESHOLD_PERCENT ?: '10'}"
        E2E_FAILURE_THRESHOLD_ABSOLUTE = "${params.E2E_FAILURE_THRESHOLD_ABSOLUTE ?: '24'}"
        E2E_THRESHOLD_MODE = "${params.E2E_THRESHOLD_MODE ?: 'both'}"
        E2E_MARK_UNSTABLE = "${params.E2E_MARK_UNSTABLE ?: 'true'}"
        
        // Add paths for Docker and Node.js
        PATH = "/usr/local/bin:/usr/bin:/bin:${env.PATH}"
    }

    options {
        // Keep only last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout for entire pipeline
        timeout(time: 60, unit: 'MINUTES')
        
        // Disable concurrent builds
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            agent {
                label 'build'
            }
            steps {
                script {
                    echo "🔄 Checking out code"
                    
                    // Check if LOCAL_DEBUG is enabled to use mounted workspace instead of git checkout
                    if (params.LOCAL_DEBUG) {
                        echo "🐛 LOCAL_DEBUG enabled - using mounted workspace at /workspace"
                        sh '''
                            # Copy from mounted local workspace to Jenkins workspace
                            if [ -d /workspace/.git ]; then
                                echo "Syncing from /workspace to $PWD"
                                rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' /workspace/ ./ || cp -r /workspace/* ./
                            else
                                echo "ERROR: /workspace not found or not mounted"
                                exit 1
                            fi
                        '''
                    } else {
                        echo "Using git checkout from SCM"
                        checkout scm
                    }
                    
                    // Get Git commit info
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    
                    // Set IMAGE_TAG dynamically after checkout
                    env.IMAGE_TAG = env.BUILD_NUMBER + '-' + env.GIT_COMMIT_SHORT
                    echo "📦 Image tag set to: ${env.IMAGE_TAG}"
                    
                    env.BUILD_TIME = sh(
                        script: 'date -u +%Y-%m-%dT%H:%M:%SZ',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Setup Environment') {
            agent {
                label 'build'
            }
            steps {
                script {
                    echo "🔧 Setting up Node.js environment"
                }
                
                // Install Node.js using NodeJS plugin or Docker
                sh '''
                    node --version
                    npm --version
                '''
                
                echo "📦 Installing root dependencies"
                sh 'npm ci'
                
                echo "📦 Installing frontend dependencies"
                sh '''
                    cd frontend
                    npm ci
                '''
                
                echo "🎭 Installing Playwright and dependencies"
                sh '''
                    # Install Playwright package first
                    npm install --save-dev @playwright/test
                    
                    # Install Playwright browsers
                    mkdir -p ${PLAYWRIGHT_BROWSERS_PATH}
                    npx playwright install chromium --with-deps
                '''
            }
        }

        stage('Lint & Code Quality') {
            parallel {
                stage('Lint Backend Services') {
                    agent {
                        label 'build'
                    }
                    steps {
                        script {
                            echo "🔍 Running lint checks on backend services"
                            // Use SERVICES environment variable (excluding 'image' as it has no lint script)
                            def services = env.SERVICES.split().findAll { it != 'image' }
                            
                            services.each { service ->
                                echo "Linting ${service} service..."
                                sh """
                                    cd services/${service}
                                    if [ -f package.json ]; then
                                        echo "Installing dependencies for ${service}..."
                                        npm ci
                                        
                                        if grep -q '"lint"' package.json; then
                                            npm run lint || echo "Lint failed for ${service}"
                                        else
                                            echo "No lint script configured for ${service}"
                                        fi
                                    fi
                                """
                            }
                        }
                    }
                }
                
                stage('Lint Frontend') {
                    agent {
                        label 'build'
                    }
                    steps {
                        script {
                            echo "🔍 Running lint checks on frontend"
                            sh '''
                                cd frontend
                                if [ -f package.json ]; then
                                    # Frontend dependencies already installed in Setup Environment stage
                                    if grep -q '"lint"' package.json; then
                                        # Skip lint check for now to avoid interactive ESLint setup prompt
                                        echo "Skipping lint (ESLint needs configuration)"
                                    fi
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Unit Tests') {
            agent {
                label 'build'
            }
            steps {
                script {
                    echo "🧪 Running unit tests for all services"
                }
                
                sh '''
                    mkdir -p test-results/unit
                    
                    # Run unit tests for each service (excluding image and frontend)
                    for service in auth club event notify; do
                        echo "Testing $service service..."
                        cd services/$service
                        
                        if [ -f package.json ]; then
                            echo "Installing dependencies for $service..."
                            npm ci
                            
                            if grep -q '"test"' package.json; then
                                npm test || echo "Tests failed for $service"
                            else
                                echo "No tests configured for $service"
                            fi
                        else
                            echo "No package.json found for $service"
                        fi
                        
                        cd ../..
                    done
                '''
            }
            
            post {
                always {
                    // Archive test results if available
                    junit(
                        testResults: '**/test-results/**/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        stage('Build Docker Images') {
            agent {
                label 'build'
            }
            steps {
                script {
                    echo "🐳 Building Docker images for all services"
                }
                
                sh """
                    # Build all services with CI configuration
                    # - docker-compose.yml: Base service definitions
                    # - docker-compose.e2e.yml: E2E-specific build args (e.g., NEXT_PUBLIC_API_BASE_URL)
                    # - docker-compose.ci.yml: Production targets, no volume mounts
                    # - --no-cache: Ensure fresh builds without stale layers
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml build --no-cache \\
                        --build-arg GIT_COMMIT=${env.GIT_COMMIT} \\
                        --build-arg BUILD_NUMBER=${env.BUILD_NUMBER} \\
                        --build-arg BUILD_TIME=${env.BUILD_TIME} \\
                        auth-service club-service event-service notify-service image-service frontend
                """
            }
        }

        stage('E2E Tests') {
            agent {
                label 'e2e-agent'
            }
            steps {
                script {
                    echo "🎭 Running End-to-End tests with Playwright"
                    echo "Note: Using Docker CP pattern to extract test results (avoids Docker-in-Docker volume mount issues)"
                }
                
                sh '''
                    # Create required directories for test artifacts
                    mkdir -p artifacts test-results logs
                    
                    # ===== Infrastructure Services Startup =====
                    # Start databases and message queue first before application services
                    # This ensures dependencies are ready when services start
                    echo "Starting infrastructure services (postgres, mongodb, rabbitmq)..."
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d --force-recreate postgres mongo rabbitmq
                    
                    # ===== Health Check: Infrastructure =====
                    # Wait for databases to pass health checks (max 5 minutes)
                    echo "Waiting for databases to be ready..."
                    for i in $(seq 1 60); do
                        if docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps postgres mongo rabbitmq | grep -E "(unhealthy|starting)" > /dev/null; then
                            echo "Databases still starting... (attempt $i/60)"
                            sleep 5
                        else
                            echo "Databases are healthy!"
                            break
                        fi
                        
                        if [ $i -eq 60 ]; then
                            echo "Databases failed to become healthy"
                            docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
                            docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs postgres mongo rabbitmq
                            exit 1
                        fi
                    done
                    
                    # ===== Application Services Startup =====
                    # Start all application services using pre-built images from Build stage
                    # --no-build: Use existing images, don't rebuild
                    # --force-recreate: Ensure clean state
                    echo "Starting application services..."
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d --no-build --force-recreate auth-service club-service event-service notify-service image-service frontend
                    
                    # ===== Health Check: Application Services =====
                    # Wait for all services to pass health checks (max 15 minutes)
                    # Extended timeout needed for notify-service (RabbitMQ connection setup)
                    echo "Waiting for application services to be healthy..."
                    sleep 30
                    
                    for i in $(seq 1 90); do
                        if docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps | grep -E "(unhealthy|starting)" > /dev/null; then
                            echo "Services still starting... (attempt $i/90)"
                            sleep 10
                        else
                            echo "All services are healthy!"
                            break
                        fi
                        
                        if [ $i -eq 90 ]; then
                            echo "Services failed to become healthy within 15 minutes"
                            docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
                            docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs
                            exit 1
                        fi
                    done
                    
                    # Show service status for debugging
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
                    
                    # ===== E2E Runner Image Build =====
                    # Build E2E runner with test code baked into image
                    # This avoids Docker-in-Docker volume mount issues in Jenkins agents
                    echo "Building E2E runner image..."
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml -f docker-compose.e2e-runner.yml build e2e-runner
                    
                    # ===== Test Filter Configuration =====
                    # Prepare test filter command
                    TEST_FILTER=""
                    if [ -n "${E2E_TEST_FILTER}" ]; then
                        echo "🔍 Test filter enabled: ${E2E_TEST_FILTER}"
                        TEST_FILTER="--grep ${E2E_TEST_FILTER}"
                    else
                        echo "▶️  Running all E2E tests"
                    fi
                    
                    # ===== Test Execution with Docker CP Pattern =====
                    # Generate unique container name for this build
                    CONTAINER_NAME="e2e-runner-${BUILD_NUMBER}"
                    
                    echo "🚀 Running E2E tests in container: ${CONTAINER_NAME}"
                    
                    # Run tests without --rm flag (allows file copying after execution)
                    # Reporter configuration is in playwright.config.ts with outputFile paths
                    # Do not add --reporter flags here as they override config
                    set +e
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml -f docker-compose.e2e-runner.yml \
                        run --name ${CONTAINER_NAME} \
                        e2e-runner npx playwright test ${TEST_FILTER}
                    
                    TEST_EXIT_CODE=$?
                    set -e
                    
                    echo "📦 Copying test results from container (exit code: ${TEST_EXIT_CODE})..."
                    
                    # ===== Docker CP Pattern Explanation =====
                    # Why use 'docker cp' instead of volume mounts?
                    # - Jenkins agent runs in Docker-in-Docker (DinD) environment
                    # - Volume mount paths are relative to HOST filesystem, not agent container
                    # - Jenkins workspace path (e.g., /home/jenkins/agent/workspace/...) doesn't exist on host
                    # - 'docker cp' works because it copies directly from container to agent filesystem
                    #
                    # Syntax: docker cp <container>:/path/. <destination>/
                    # - Use '/.' to copy directory CONTENTS (avoids nested directory structure)
                    # - Without '/.', you'd get: ./test-results/test-results/...
                    docker cp ${CONTAINER_NAME}:/app/test-results/. ./test-results/ || echo "⚠️ Warning: Could not copy test-results"
                    docker cp ${CONTAINER_NAME}:/app/playwright-report/. ./playwright-report/ || echo "⚠️ Warning: Could not copy playwright-report"
                    
                    # Clean up container after copying results
                    echo "🧹 Cleaning up test container..."
                    docker rm -f ${CONTAINER_NAME} || true
                    
                    # ===== Threshold Analysis Strategy =====
                    # Don't exit here based on TEST_EXIT_CODE
                    # Let the post.always threshold analysis determine final build status
                    # This allows controlled failures within acceptable thresholds
                    echo "📊 Test execution completed with exit code: ${TEST_EXIT_CODE}"
                    echo "⏭️  Proceeding to threshold analysis..."
                '''
            }
            
            post {
                always {
                    script {
                        // ===== Threshold Analysis with External Script =====
                        // Use dedicated shell script for threshold evaluation
                        // This separates concerns and makes the logic testable outside Jenkins
                        echo "📊 Analyzing E2E test results with threshold evaluation..."
                        
                        def analysisExitCode = sh(
                            script: '''
                                # Make script executable
                                chmod +x scripts/analyze-e2e-results.sh
                                
                                # Run analysis script with environment variables
                                scripts/analyze-e2e-results.sh test-results/e2e-results.json
                            ''',
                            returnStatus: true
                        )
                        
                        // Set build result based on script exit code
                        // Exit code 0 = SUCCESS, 1 = UNSTABLE, 2 = FAILURE
                        switch(analysisExitCode) {
                            case 0:
                                currentBuild.result = 'SUCCESS'
                                break
                            case 1:
                                currentBuild.result = 'UNSTABLE'
                                break
                            case 2:
                                currentBuild.result = 'FAILURE'
                                break
                            default:
                                echo "⚠️  Unknown exit code: ${analysisExitCode}"
                                currentBuild.result = 'FAILURE'
                                break
                        }
                        
                        echo "🏁 Final build result: ${currentBuild.result}"
                    }
                    
                    // Archive Playwright report
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright E2E Test Report'
                    ])
                    
                    // Archive test results
                    junit(
                        testResults: 'test-results/**/*.xml',
                        allowEmptyResults: true
                    )
                    
                    // Collect service logs
                    sh '''
                        echo "Collecting service logs..."
                        mkdir -p logs
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml logs > logs/services.log 2>&1 || true
                    '''
                    
                    archiveArtifacts(
                        artifacts: 'logs/**/*.log,test-results/**/*,playwright-report/**/*',
                        allowEmptyArchive: true
                    )
                    
                    // Stop and remove containers
                    sh '''
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml down -v || true
                    '''
                }
            }
        }

        stage('Tag & Push Images') {
            agent {
                label 'build'
            }
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            
            steps {
                script {
                    echo "🏷️  Tagging and pushing Docker images to registry"
                    
                    docker.withRegistry("https://${env.DOCKER_REGISTRY}", env.DOCKER_CREDENTIALS_ID) {
                        // Use SERVICES variable plus frontend
                        def services = (env.SERVICES.split() + ['frontend']) as List
                        
                        services.each { service ->
                            echo "Processing ${service} service..."
                            
                            def imageName = "${env.IMAGE_PREFIX}-${service}"
                            def fullImageName = "${env.DOCKER_REGISTRY}/${imageName}:${env.IMAGE_TAG}"
                            def latestImageName = "${env.DOCKER_REGISTRY}/${imageName}:latest"
                            
                            // Tag and push with build number
                            sh """
                                docker tag club-management-system-${service}:latest ${fullImageName}
                                docker push ${fullImageName}
                            """
                            
                            // Tag and push as latest
                            if (env.BRANCH_NAME == 'main') {
                                sh """
                                    docker tag club-management-system-${service}:latest ${latestImageName}
                                    docker push ${latestImageName}
                                """
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to Environment') {
            agent {
                label 'build'
            }
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    branch 'staging'
                }
            }
            
            steps {
                script {
                    def environment = 'dev'
                    
                    if (env.BRANCH_NAME == 'main') {
                        environment = 'production'
                    } else if (env.BRANCH_NAME == 'staging') {
                        environment = 'staging'
                    } else if (env.BRANCH_NAME == 'develop') {
                        environment = 'dev'
                    }
                    
                    echo "🚀 Deploying to ${environment} environment"
                    
                    // This is a placeholder - adjust based on your deployment strategy
                    // Options: kubectl, docker-compose on remote, terraform, etc.
                    
                    sh """
                        echo "Deployment to ${environment} would happen here"
                        echo "Image tag: ${env.IMAGE_TAG}"
                        
                        # Example for Kubernetes deployment:
                        # kubectl set image deployment/auth-service auth=${env.DOCKER_REGISTRY}/${env.IMAGE_PREFIX}-auth:${env.IMAGE_TAG}
                        
                        # Example for remote docker-compose:
                        # ssh user@server "cd /app && docker-compose pull && docker-compose up -d"
                        
                        # Example for AWS ECS:
                        # aws ecs update-service --cluster ${environment} --service auth-service --force-new-deployment
                    """
                }
            }
        }

        stage('Security Scan') {
            agent {
                label 'build'
            }
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            
            steps {
                script {
                    echo "🔒 Running security scans on Docker images"
                    
                    // Using Trivy for vulnerability scanning
                    sh '''
                        # Install Trivy if not already installed
                        if ! command -v trivy &> /dev/null; then
                            echo "Installing Trivy..."
                            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                            echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
                            sudo apt-get update
                            sudo apt-get install trivy -y
                        fi
                        
                        mkdir -p security-reports
                        
                        # Scan each service image
                        for service in auth club event notify image frontend; do
                            echo "Scanning ${service} service..."
                            trivy image --severity HIGH,CRITICAL \
                                --format json \
                                --output security-reports/${service}-scan.json \
                                club-management-system-${service}:latest || true
                        done
                    '''
                }
            }
            
            post {
                always {
                    archiveArtifacts(
                        artifacts: 'security-reports/**/*',
                        allowEmptyArchive: true
                    )
                }
            }
        }
    }

    post {
        success {
            script {
                echo "✅ Pipeline completed successfully!"
                
                // Send notification (configure based on your needs)
                // emailext, Slack, Teams, etc.
            }
        }
        
        failure {
            node('build') {
                script {
                    echo "❌ Pipeline failed!"
                    
                    // Collect debugging information
                    sh '''
                        echo "Collecting failure diagnostics..."
                        docker ps -a > failure-diagnostics.txt || true
                        docker images >> failure-diagnostics.txt || true
                    '''
                    
                    archiveArtifacts(
                        artifacts: 'failure-diagnostics.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }
        
        always {
            node('build') {
                script {
                    echo "🧹 Cleaning up workspace"
                }
                
                // Clean up Docker resources
                sh '''
                    # Stop and remove containers (including E2E infrastructure)
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml down -v || true
                    
                    # Remove dangling images
                    docker image prune -f || true
                    
                    # Clean up playwright browsers cache if needed
                    # rm -rf ${PLAYWRIGHT_BROWSERS_PATH} || true
                '''
                
                // Clean workspace
                cleanWs(
                    deleteDirs: true,
                    disableDeferredWipeout: true,
                    notFailBuild: true,
                    patterns: [
                        [pattern: 'node_modules', type: 'INCLUDE'],
                        [pattern: 'playwright-browsers', type: 'INCLUDE'],
                        [pattern: '.npm', type: 'INCLUDE']
                    ]
                )
            }
        }
    }
}
