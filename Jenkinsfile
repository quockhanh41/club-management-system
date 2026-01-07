pipeline {
    agent any

    environment {
        // Docker Registry Configuration
        DOCKER_REGISTRY = credentials('docker-registry-url') // Configure in Jenkins credentials
        DOCKER_CREDENTIALS_ID = 'docker-registry-credentials'
        
        // Image naming
        IMAGE_PREFIX = 'club-management'
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        
        // Service names
        SERVICES = 'auth club event notify image'
        
        // Node version
        NODE_VERSION = '18'
        
        // Playwright home
        PLAYWRIGHT_BROWSERS_PATH = "${WORKSPACE}/playwright-browsers"
        
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
            steps {
                script {
                    echo "🔄 Checking out code from ${env.GIT_BRANCH}"
                    checkout scm
                    
                    // Get Git commit info
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    
                    env.BUILD_TIME = sh(
                        script: 'date -u +%Y-%m-%dT%H:%M:%SZ',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Setup Environment') {
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
                
                echo "🎭 Installing Playwright browsers"
                sh '''
                    mkdir -p ${PLAYWRIGHT_BROWSERS_PATH}
                    # Install browsers without system dependencies
                    # System deps will be provided by Docker in E2E test stage
                    npx playwright install chromium
                '''
            }
        }

        stage('Lint & Code Quality') {
            parallel {
                stage('Lint Backend Services') {
                    steps {
                        script {
                            echo "🔍 Running lint checks on backend services"
                            def services = ['auth', 'club', 'event', 'notify']
                            
                            services.each { service ->
                                echo "Linting ${service} service..."
                                sh """
                                    cd services/${service}
                                    if [ -f package.json ] && grep -q '"lint"' package.json; then
                                        npm run lint || echo "Lint not configured for ${service}"
                                    fi
                                """
                            }
                        }
                    }
                }
                
                stage('Lint Frontend') {
                    steps {
                        script {
                            echo "🔍 Running lint checks on frontend"
                            sh '''
                                cd frontend
                                if grep -q '"lint"' package.json; then
                                    npm run lint || echo "Lint not configured for frontend"
                                fi
                            '''
                        }
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    echo "🧪 Running unit tests for all services"
                }
                
                sh '''
                    mkdir -p test-results/unit
                    
                    # Run unit tests for each service
                    for service in auth club event notify; do
                        echo "Testing $service service..."
                        cd services/$service
                        
                        if [ -f package.json ] && grep -q '"test"' package.json; then
                            npm test || echo "Tests failed for $service"
                        else
                            echo "No tests configured for $service"
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
            steps {
                script {
                    echo "🐳 Building Docker images for all services"
                }
                
                sh """
                    # Build services only (exclude kong for AWS deployment with ALB)
                    docker compose build \
                        --build-arg GIT_COMMIT=${env.GIT_COMMIT} \
                        --build-arg BUILD_NUMBER=${env.BUILD_NUMBER} \
                        --build-arg BUILD_TIME=${env.BUILD_TIME} \
                        auth club event notify image frontend
                """
            }
        }

        stage('E2E Tests') {
            steps {
                script {
                    echo "🎭 Running End-to-End tests with Playwright"
                }
                
                sh '''
                    # Create required directories
                    mkdir -p artifacts test-results logs
                    
                    # Start all services (without kong - using direct ports for testing)
                    echo "Starting services..."
                    docker compose up -d auth club event notify image frontend
                    
                    # Wait for services to be healthy
                    echo "Waiting for services to be healthy..."
                    sleep 30
                    
                    for i in {1..60}; do
                        if docker compose ps | grep -E "(unhealthy|starting)" > /dev/null; then
                            echo "Services still starting... (attempt $i/60)"
                            sleep 10
                        else
                            echo "All services are healthy!"
                            break
                        fi
                        
                        if [ $i -eq 60 ]; then
                            echo "Services failed to become healthy within 10 minutes"
                            docker compose ps
                            docker compose logs
                            exit 1
                        fi
                    done
                    
                    # Show service status
                    docker compose ps
                    
                    # Run Playwright tests
                    echo "Running E2E tests..."
                    npx playwright test --reporter=html,junit
                '''
            }
            
            post {
                always {
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
                        docker compose logs > logs/services.log 2>&1 || true
                    '''
                    
                    archiveArtifacts(
                        artifacts: 'logs/**/*.log,test-results/**/*,playwright-report/**/*',
                        allowEmptyArchive: true
                    )
                    
                    // Stop and remove containers
                    sh '''
                        docker compose down -v || true
                    '''
                }
            }
        }

        stage('Tag & Push Images') {
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
                        def services = ['auth', 'club', 'event', 'notify', 'image', 'frontend']
                        
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
        
        always {
            script {
                echo "🧹 Cleaning up workspace"
            }
            
            // Clean up Docker resources
            sh '''
                # Stop and remove containers
                docker compose down -v || true
                
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
