package com.oryfolks.certify.exception;

/**
 * Thrown when an unauthenticated user attempts to access a protected resource.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

}