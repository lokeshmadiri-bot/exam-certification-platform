package com.oryfolks.certify.constants;

/**
 * Application-wide constants used across the Certification module.
 */
public final class ApiConstants {

    private ApiConstants() {
        // Prevent instantiation
    }

    // ==========================
    // Success Messages
    // ==========================

    public static final String SUCCESS = "Success";

    public static final String CREATED_SUCCESSFULLY = "Created successfully.";

    public static final String UPDATED_SUCCESSFULLY = "Updated successfully.";

    public static final String DELETED_SUCCESSFULLY = "Deleted successfully.";

    public static final String FETCHED_SUCCESSFULLY = "Data fetched successfully.";

    // ==========================
    // Error Messages
    // ==========================

    public static final String RESOURCE_NOT_FOUND = "Requested resource not found.";

    public static final String INVALID_REQUEST = "Invalid request.";

    public static final String UNAUTHORIZED = "Unauthorized access.";

    public static final String INTERNAL_SERVER_ERROR = "An unexpected error occurred. Please try again later.";

    // ==========================
    // Pagination
    // ==========================

    public static final int DEFAULT_PAGE_NUMBER = 0;

    public static final int DEFAULT_PAGE_SIZE = 10;

}