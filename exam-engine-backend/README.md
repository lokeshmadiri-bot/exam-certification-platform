# OryFolks Certify — Backend API Service

Production-ready Spring Boot backend application managing certifications, scoring criteria, and remote proctoring security.

## Technology Stack

* Java 17
* Spring Boot 3.2.5
* Spring Security (JWT authentication)
* Spring Data JPA
* PostgreSQL
* AWS SDK v2 (S3 integration)
* Maven

## Configuration

Settings are configured via `src/main/resources/application.yml` using standard environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Web service server port | `8080` |
| `DB_HOST` | Database host URL | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database schema name | `certify` |
| `DB_USERNAME` | DB Username | `postgres` |
| `DB_PASSWORD` | DB Password | `postgres` |
| `JWT_SECRET` | Secret key for JWT hashing | (Auto-assigned) |
| `STORAGE_PROVIDER` | Toggle storage: `local` or `s3` | `local` |

## Getting Started

1. Set up a PostgreSQL instance named `certify`.
2. Clean and package the application:
   ```bash
   mvn clean package
   ```
3. Run the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```

*Note: Default testing credentials (`aarav` / `password123` for Candidate, `ravi` / `password123` for Admin) are seeded automatically on database initialization.*
