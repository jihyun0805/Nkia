pipeline {
    agent any

    environment {
        BACKEND_DIR = "backend/Orbis"
        AI_DIR = "ai"
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

        stage('4. Deploy Backend Stack') {
            steps {
                echo 'Backend, Frontend, DB, Redis, Nginx, Monitoring 배포'

                dir("${BACKEND_DIR}") {
                    sh '''
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
                          up -d --build
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
        }

        failure {
            echo '배포 실패. Jenkins Console Output 확인 필요'
        }
    }
}