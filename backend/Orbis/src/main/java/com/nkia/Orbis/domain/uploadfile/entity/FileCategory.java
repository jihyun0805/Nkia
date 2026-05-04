package com.nkia.Orbis.domain.uploadfile.entity;

public enum FileCategory {
    IMAGE("images"),
    QUOTATION("quotations"),
    PRB("prbs"),
    PRB_RESULT("prb-results"),
    RFP_ANALYZE("rfp-analyzes"),
    PROPOSAL("proposals"),
    BID_RESULT("bid-results"),
    ORDER_REPORT("order-reports"),
    CONTRACT("contracts"),
    PROJECT_RESULT("project-results"),
    MAINTENANCE_QUOTATION("maintenance-quotations"),
    MAINTENANCE_CONTRACT("maintenance-contracts"),
    BILLING("billings"),
    CUSTOMER_SUPPORT("customer-supports");

    private final String directory;

    FileCategory(String directory) {
        this.directory = directory;
    }

    public String getDirectory() {
        return directory;
    }
}