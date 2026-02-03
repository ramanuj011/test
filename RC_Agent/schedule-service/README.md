# Schedule Service

Spring Boot service exposing `GET /api/schedules`.

Run locally:
- mvn -f schedule-service/ spring-boot:run

Docker:
- docker build -t schedule-service ./schedule-service
- docker run -p 8081:8081 schedule-service
