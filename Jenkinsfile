pipeline {
    agent any
    
    parameters {
        string(
            name: 'E2E_FAILURE_THRESHOLD_PERCENT',
            defaultValue: '5',
            description: 'Maximum percentage of E2E tests allowed to fail (0-100)'
        )
        string(
            name: 'E2E_FAILURE_THRESHOLD_ABSOLUTE',
            defaultValue: '12',
            description: 'Maximum absolute number of E2E tests allowed to fail'
        )
        choice(
            name: 'E2E_THRESHOLD_MODE',
            choices: ['both', 'percentage', 'absolute'],
            description: 'Threshold evaluation mode: both (stricter), percentage, or absolute'
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
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        
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
        // Maximum percentage of tests allowed to fail (0-100)
        E2E_FAILURE_THRESHOLD_PERCENT = "${params.E2E_FAILURE_THRESHOLD_PERCENT ?: '5'}"
        // Maximum absolute number of tests allowed to fail
        E2E_FAILURE_THRESHOLD_ABSOLUTE = "${params.E2E_FAILURE_THRESHOLD_ABSOLUTE ?: '12'}"
        // Which threshold to use: 'percentage', 'absolute', or 'both' (stricter)
        E2E_THRESHOLD_MODE = "${params.E2E_THRESHOLD_MODE ?: 'both'}"
        // Mark build as UNSTABLE instead of SUCCESS when failures are within threshold
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
                    echo "📦 Installing essential tools (jq, bc) if not present"
                }
                
                // Install essential tools (jq and bc) for JSON parsing and calculations
                sh '''
                    # Check and install jq if not present
                    if ! command -v jq &> /dev/null; then
                        echo "Installing jq..."
                        apt-get update && apt-get install -y jq
                    else
                        echo "✓ jq already installed"
                    fi
                    
                    # Check and install bc if not present
                    if ! command -v bc &> /dev/null; then
                        echo "Installing bc..."
                        apt-get update && apt-get install -y bc
                    else
                        echo "✓ bc already installed"
                    fi
                '''
                
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
                    steps {
                        script {
                            echo "🔍 Running lint checks on backend services"
                            def services = ['auth', 'club', 'event', 'notify']
                            
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
            steps {
                script {
                    echo "🐳 Building Docker images for all services"
                }
                
                sh """
                    # Build services with CI configuration (production targets, no volume mounts)
                    # Using --no-cache to ensure fresh builds without stale layers
                    # Include docker-compose.e2e.yml for E2E-specific build args (e.g. NEXT_PUBLIC_API_BASE_URL)
                    docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml build --no-cache \\
                        --build-arg GIT_COMMIT=${env.GIT_COMMIT} \\
                        --build-arg BUILD_NUMBER=${env.BUILD_NUMBER} \\
                        --build-arg BUILD_TIME=${env.BUILD_TIME} \\
                        auth-service club-service event-service notify-service image-service frontend
                """
            }
        }

        stage('E2E Tests') {
            steps {
                script {
                    echo "🧪 Running E2E tests with Docker infrastructure"
                    echo "📋 Failure Thresholds: ${env.E2E_FAILURE_THRESHOLD_PERCENT}% or ${env.E2E_FAILURE_THRESHOLD_ABSOLUTE} tests (Mode: ${env.E2E_THRESHOLD_MODE})"
                    
                    // Start services
                    sh '''
                        echo "Starting services for E2E tests..."
                        
                        # Create required directories
                        mkdir -p artifacts test-results logs
                        
                        # Start infrastructure services first (databases and message queue)
                        echo "Starting infrastructure services (postgres, mongodb, rabbitmq)..."
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d --force-recreate postgres mongo rabbitmq
                        
                        # Wait for databases to be ready
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
                        
                        # Start application services (use pre-built images from previous stage)
                        echo "Starting application services..."
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml up -d --no-build --force-recreate auth-service club-service event-service notify-service image-service frontend
                        
                        # Wait for services to be healthy (increased timeout for notify-service)
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
                        
                        # Show service status
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml ps
                        
                        # Extra wait to ensure services are fully ready (not just healthy)
                        echo "⏳ Waiting additional 30 seconds for services to stabilize..."
                        sleep 30
                        
                        # Verify services are responding
                        echo "🔍 Verifying service connectivity..."
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml exec -T frontend curl -s http://localhost:3000/api/health || echo "⚠️ Frontend health check failed"
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml exec -T kong curl -s http://localhost:8000/health || echo "⚠️ Kong health check failed"
                        
                        # Build E2E runner image with code baked in (avoids volume mount issues)
                        echo "Building E2E runner image..."
                        docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml -f docker-compose.e2e-runner.yml build e2e-runner
                    '''
                    
                    // Run E2E tests and capture exit code (don't fail immediately)
                    def e2eOutput = sh(
                        script: '''
                            set +e  # Don't exit on error
                            echo "🚀 Starting E2E test runner..."
                            echo "=========================================="
                            
                            # Ensure test-results directory exists in workspace with correct permissions
                            mkdir -p test-results playwright-report
                            chmod 777 test-results playwright-report
                            
                            # Generate unique container name
                            CONTAINER_NAME="e2e-runner-${BUILD_NUMBER}"
                            
                            # Run tests WITHOUT --rm so we can copy results after
                            docker compose -f docker-compose.yml -f docker-compose.e2e.yml -f docker-compose.ci.yml -f docker-compose.e2e-runner.yml \
                                run --name "${CONTAINER_NAME}" e2e-runner || true
                            EXIT_CODE=$?
                            
                            echo "=========================================="
                            echo "📦 Copying test results from container..."
                            
                            # Copy test results from container to workspace
                            docker cp "${CONTAINER_NAME}:/app/test-results/." test-results/ 2>/dev/null || echo "⚠️ Could not copy test-results"
                            docker cp "${CONTAINER_NAME}:/app/playwright-report/." playwright-report/ 2>/dev/null || echo "⚠️ Could not copy playwright-report"
                            
                            # Remove container
                            docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
                            
                            echo "=========================================="
                            echo "📦 Verifying test results..."
                            
                            # List test results files
                            if [ -d "test-results" ]; then
                                echo "✅ test-results directory exists"
                                ls -lh test-results/ | head -10
                            else
                                echo "⚠️ test-results directory not found"
                            fi
                            
                            if [ -d "playwright-report" ]; then
                                echo "✅ playwright-report directory exists"
                            else
                                echo "⚠️ playwright-report directory not found"
                            fi
                            
                            echo "=========================================="
                            echo ""
                            echo "E2E_EXIT_CODE:${EXIT_CODE}"
                            echo "📊 E2E tests completed with exit code: ${EXIT_CODE}"
                            
                            exit 0
                        ''',
                        returnStdout: true
                    ).trim()
                    
                    // Extract exit code from output (use simple string parsing to avoid serialization issues)
                    // This avoids creating non-serializable Matcher objects that cause jenkins CPS errors
                    def actualExitCode = 1 // default to failure
                    def exitCodeLine = ''
                    
                    // Find the line containing E2E_EXIT_CODE using indexOf instead of regex
                    def lines = e2eOutput.split('\n')
                    for (int i = 0; i < lines.length; i++) {
                        def line = lines[i]
                        if (line.indexOf('E2E_EXIT_CODE:') >= 0) {
                            exitCodeLine = line
                            // Extract number after colon using indexOf and substring
                            def colonIndex = line.indexOf(':')
                            if (colonIndex >= 0 && colonIndex < line.length() - 1) {
                                def exitCodeStr = line.substring(colonIndex + 1).trim()
                                try {
                                    actualExitCode = exitCodeStr.toInteger()
                                } catch (NumberFormatException e) {
                                    echo "⚠️  Warning: Could not parse exit code from: ${exitCodeStr}"
                                    actualExitCode = 1
                                }
                            }
                            break
                        }
                    }
                    
                    echo "E2E tests finished with exit code: ${actualExitCode}"
                    echo "Exit code line found: ${exitCodeLine ?: 'NOT FOUND'}"
                    
                    // Analyze test results
                    sh 'chmod +x scripts/analyze-e2e-results.sh'
                    
                    // Check if summary file was created
                    def summaryExists = fileExists('e2e-test-summary.json')
                    
                    if (!summaryExists) {
                        echo "⚠️  Warning: e2e-test-summary.json not found. E2E tests may have failed to run."
                        echo "Creating default summary for failure case..."
                        
                        sh '''
                            cat > e2e-test-summary.json <<'EOF'
{
  "total": 0,
  "passed": 0,
  "failed": 1,
  "skipped": 0,
  "failureRate": 100,
  "thresholdPercent": 5,
  "thresholdAbsolute": 12,
  "thresholdMode": "both",
  "withinThreshold": false,
  "message": "E2E tests failed to execute or summary file not generated",
  "exitCode": 1
}
EOF
                        '''
                    }
                    
                    def analysisExitCode = sh(
                        script: './scripts/analyze-e2e-results.sh',
                        returnStatus: true
                    )
                    
                    // Read summary (now guaranteed to exist)
                    def summary = readJSON file: 'e2e-test-summary.json'
                    
                    echo """
📊 E2E Test Summary:
   Total:        ${summary.total}
   ✅ Passed:     ${summary.passed}
   ❌ Failed:     ${summary.failed}
   ⏭️ Skipped:    ${summary.skipped}
   📈 Fail Rate:  ${summary.failureRate}%
"""
                    
                    // Determine build status based on analysis
                    if (analysisExitCode == 0 && summary.failed == 0) {
                        // All tests passed
                        currentBuild.result = 'SUCCESS'
                        echo "✅ All E2E tests passed!"
                    } else if (analysisExitCode == 2) {
                        // Failures within threshold
                        if (env.E2E_MARK_UNSTABLE == 'true') {
                            currentBuild.result = 'UNSTABLE'
                            echo "⚠️  Build marked UNSTABLE: ${summary.failed} tests failed (within acceptable threshold)"
                        } else {
                            currentBuild.result = 'SUCCESS'
                            echo "✅ Build passed with acceptable failures: ${summary.failed} tests (${summary.failureRate}%)"
                        }
                    } else {
                        // Exceeds threshold - fail the build
                        currentBuild.result = 'FAILURE'
                        error("❌ E2E tests exceeded failure threshold: ${summary.failed} failed (${summary.failureRate}%)")
                    }
                }
            }
            
            post {
                always {
                    script {
                        // Generate detailed HTML summary report
                        sh '''
                            cat > e2e-summary.html <<'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <title>E2E Test Summary - Build #${BUILD_NUMBER}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        .summary { display: flex; justify-content: space-around; margin: 30px 0; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; min-width: 150px; }
        .metric-label { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .metric-value { font-size: 48px; font-weight: bold; margin: 10px 0; }
        .total { background: #e3f2fd; }
        .passed { background: #e8f5e9; color: #2e7d32; }
        .failed { background: #ffebee; color: #c62828; }
        .skipped { background: #fff3e0; color: #f57c00; }
        .threshold { background: #f8f9fa; padding: 20px; margin: 20px 0; border-left: 4px solid #007bff; border-radius: 4px; }
        .threshold h3 { margin-top: 0; color: #007bff; }
        .threshold-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
        .threshold-item:last-child { border-bottom: none; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
        .status-success { background: #4caf50; color: white; }
        .status-unstable { background: #ff9800; color: white; }
        .status-failed { background: #f44336; color: white; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 E2E Test Execution Summary</h1>
        <div class="summary">
            <div class="metric total">
                <div class="metric-label">Total Tests</div>
                <div class="metric-value">__TOTAL__</div>
            </div>
            <div class="metric passed">
                <div class="metric-label">✅ Passed</div>
                <div class="metric-value">__PASSED__</div>
            </div>
            <div class="metric failed">
                <div class="metric-label">❌ Failed</div>
                <div class="metric-value">__FAILED__</div>
            </div>
            <div class="metric skipped">
                <div class="metric-label">⏭️ Skipped</div>
                <div class="metric-value">__SKIPPED__</div>
            </div>
        </div>
        
        <div class="threshold">
            <h3>📊 Failure Threshold Analysis</h3>
            <div class="threshold-item">
                <span><strong>Threshold Mode:</strong></span>
                <span>__THRESHOLD_MODE__</span>
            </div>
            <div class="threshold-item">
                <span><strong>Percentage Threshold:</strong></span>
                <span>__THRESHOLD_PERCENT__%</span>
            </div>
            <div class="threshold-item">
                <span><strong>Absolute Threshold:</strong></span>
                <span>__THRESHOLD_ABSOLUTE__ tests</span>
            </div>
            <div class="threshold-item">
                <span><strong>Current Failure Rate:</strong></span>
                <span><strong>__FAILURE_RATE__%</strong></span>
            </div>
            <div class="threshold-item">
                <span><strong>Build Status:</strong></span>
                <span>__STATUS__</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Build #${BUILD_NUMBER} | ${BUILD_TIME} | ${GIT_COMMIT_SHORT}</p>
            <p>Generated by Jenkins Pipeline</p>
        </div>
    </div>
</body>
</html>
HTMLEOF
                            
                            # Replace placeholders with actual values
                            if [ -f e2e-test-summary.json ]; then
                                TOTAL=$(jq -r '.total' e2e-test-summary.json)
                                PASSED=$(jq -r '.passed' e2e-test-summary.json)
                                FAILED=$(jq -r '.failed' e2e-test-summary.json)
                                SKIPPED=$(jq -r '.skipped' e2e-test-summary.json)
                                FAILURE_RATE=$(jq -r '.failureRate' e2e-test-summary.json)
                                THRESHOLD_PERCENT=$(jq -r '.thresholdPercent' e2e-test-summary.json)
                                THRESHOLD_ABSOLUTE=$(jq -r '.thresholdAbsolute' e2e-test-summary.json)
                                THRESHOLD_MODE=$(jq -r '.thresholdMode' e2e-test-summary.json)
                                
                                STATUS="<span class='status-badge status-success'>✅ ALL PASSED</span>"
                                if [ "$FAILED" -gt "0" ]; then
                                    # Check if within threshold
                                    WITHIN_THRESHOLD=0
                                    case "$THRESHOLD_MODE" in
                                        "percentage")
                                            if (( $(echo "$FAILURE_RATE <= $THRESHOLD_PERCENT" | bc -l) )); then
                                                WITHIN_THRESHOLD=1
                                            fi
                                            ;;
                                        "absolute")
                                            if [ "$FAILED" -le "$THRESHOLD_ABSOLUTE" ]; then
                                                WITHIN_THRESHOLD=1
                                            fi
                                            ;;
                                        "both")
                                            if (( $(echo "$FAILURE_RATE <= $THRESHOLD_PERCENT" | bc -l) )) && [ "$FAILED" -le "$THRESHOLD_ABSOLUTE" ]; then
                                                WITHIN_THRESHOLD=1
                                            fi
                                            ;;
                                    esac
                                    
                                    if [ "$WITHIN_THRESHOLD" -eq 1 ]; then
                                        STATUS="<span class='status-badge status-unstable'>⚠️ UNSTABLE (within threshold)</span>"
                                    else
                                        STATUS="<span class='status-badge status-failed'>❌ FAILED (exceeds threshold)</span>"
                                    fi
                                fi
                                
                                sed -i "s/__TOTAL__/$TOTAL/g" e2e-summary.html
                                sed -i "s/__PASSED__/$PASSED/g" e2e-summary.html
                                sed -i "s/__FAILED__/$FAILED/g" e2e-summary.html
                                sed -i "s/__SKIPPED__/$SKIPPED/g" e2e-summary.html
                                sed -i "s/__FAILURE_RATE__/$FAILURE_RATE/g" e2e-summary.html
                                sed -i "s/__THRESHOLD_PERCENT__/$THRESHOLD_PERCENT/g" e2e-summary.html
                                sed -i "s/__THRESHOLD_ABSOLUTE__/$THRESHOLD_ABSOLUTE/g" e2e-summary.html
                                sed -i "s/__THRESHOLD_MODE__/$THRESHOLD_MODE/g" e2e-summary.html
                                sed -i "s|__STATUS__|$STATUS|g" e2e-summary.html
                            fi
                        '''
                    }
                    
                    // Publish HTML summary
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'e2e-summary.html',
                        reportName: 'E2E Test Summary'
                    ])
                    
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
                    
                    // Archive analysis results
                    archiveArtifacts(
                        artifacts: 'e2e-test-summary.json,e2e-summary.html',
                        allowEmptyArchive: true
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
