pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    environment {
        BACKEND_DIR = "backend/Orbis"
        AI_DIR = "ai"
        DOCKER_BUILDKIT = "1"
        COMPOSE_DOCKER_CLI_BUILD = "1"
    }

    stages {
        stage('1. Checkout') {
            steps {
                echo 'GitLab에서 코드 가져오기'
                checkout scm
            }
        }

        stage('2. Docker Check') {
            steps {
                echo 'Docker 및 Docker Compose 확인'
                sh 'docker --version'
                sh 'docker compose version'
            }
        }

        stage('3. Inject Env Files') {
            steps {
                echo 'Jenkins Secret file에서 .env.prod 복사'

                withCredentials([
                    file(credentialsId: 'orbis-backend-env-prod', variable: 'BACKEND_ENV'),
                    file(credentialsId: 'orbis-ai-env-prod', variable: 'AI_ENV')
                ]) {
                    sh '''
                        cp "$BACKEND_ENV" ${BACKEND_DIR}/.env.prod
                        cp "$AI_ENV" ${AI_DIR}/.env.prod

                        echo "backend env copied"
                        ls -al ${BACKEND_DIR}/.env.prod

                        echo "ai env copied"
                        ls -al ${AI_DIR}/.env.prod
                    '''
                }
            }
        }

        stage('3.5. Detect Changed Areas') {
            steps {
                script {
                    def previousCommit = env.GIT_PREVIOUS_SUCCESSFUL_COMMIT ?: env.GIT_PREVIOUS_COMMIT
                    if (!previousCommit?.trim()) {
                        env.AI_CHANGED = "true"
                        env.BACKEND_CHANGED = "true"
                        echo '이전 커밋 정보가 없어 AI/Backend를 모두 배포 대상으로 간주합니다.'
                    } else {
                        env.AI_CHANGED = sh(
                            script: """
                                if git diff --name-only ${previousCommit} ${env.GIT_COMMIT} | grep -q '^ai/'; then
                                  echo true
                                else
                                  echo false
                                fi
                            """,
                            returnStdout: true
                        ).trim()
                        env.BACKEND_CHANGED = sh(
                            script: """
                                if git diff --name-only ${previousCommit} ${env.GIT_COMMIT} | grep -qE '^(backend/|frontend/|Jenkinsfile)'; then
                                  echo true
                                else
                                  echo false
                                fi
                            """,
                            returnStdout: true
                        ).trim()
                        echo "AI changed: ${env.AI_CHANGED}"
                        echo "Backend/Frontend changed: ${env.BACKEND_CHANGED}"
                    }
                }
            }
        }

        stage('4. Deploy Backend Stack') {
            when {
                expression { env.BACKEND_CHANGED == 'true' }
            }
            steps {
                echo 'Backend, Frontend, DB, Redis, Nginx, Monitoring 배포'

                dir("${BACKEND_DIR}") {
                    sh '''
                        docker compose --env-file .env.prod \
                          -f docker-compose.yml \
                          -f docker-compose.prod.yml \
                          down || true

                        docker compose --env-file .env.prod \
                          -f docker-compose.yml \
                          -f docker-compose.prod.yml \
                          up -d --build
                    '''
                }
            }
        }

        stage('5. Deploy AI Stack') {
            steps {
                echo 'AI FastAPI 서버 배포'

                dir("${AI_DIR}") {
                    sh '''
                        docker compose --env-file .env.prod \
                          -f docker-compose.fastapi.yml \
                          -f docker-compose.fastapi.prod.yml \
                          down || true

                        if [ "${AI_CHANGED}" = "true" ]; then
                          echo "AI 변경 감지: rebuild 수행"
                          docker compose --env-file .env.prod \
                            -f docker-compose.fastapi.yml \
                            -f docker-compose.fastapi.prod.yml \
                            up -d --build
                        else
                          echo "AI 변경 없음: 기존 이미지 재사용"
                          docker compose --env-file .env.prod \
                            -f docker-compose.fastapi.yml \
                            -f docker-compose.fastapi.prod.yml \
                            up -d
                        fi
                    '''
                }
            }
        }

        stage('6. Check Containers') {
            steps {
                echo '현재 실행 중인 컨테이너 확인'
                sh 'docker ps'
            }
        }

        stage('7. Clean Old Images') {
            steps {
                echo '사용하지 않는 Docker 이미지 정리'
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            echo '배포 성공'
            script {
                def Author_ID = sh(script: "git show -s --pretty=%an", returnStdout: true).trim()
                def Author_Name = sh(script: "git show -s --pretty=%ae", returnStdout: true).trim()
                mattermostSend(color: 'good',
                    message: "빌드 성공: ${env.JOB_NAME} #${env.BUILD_NUMBER} by ${Author_ID}(${Author_Name})\n(<${env.BUILD_URL}|Details>)",
                    endpoint: 'https://meeting.ssafy.com/hooks/jmehrjcirtyomqe9wzkyfgo1uo',
                    channel: 'S106_Jenkins_Build'
                )
            }
        }

        failure {
            echo '배포 실패. Jenkins Console Output 확인 필요'
            script {
                def Author_ID = sh(script: "git show -s --pretty=%an", returnStdout: true).trim()
                def Author_Name = sh(script: "git show -s --pretty=%ae", returnStdout: true).trim()
                mattermostSend(color: 'danger',
                    message: "빌드 실패: ${env.JOB_NAME} #${env.BUILD_NUMBER} by ${Author_ID}(${Author_Name})\n(<${env.BUILD_URL}|Details>)",
                    endpoint: 'https://meeting.ssafy.com/hooks/jmehrjcirtyomqe9wzkyfgo1uo',
                    channel: 'S106_Jenkins_Build'
                )
            }
        }
    }
}
