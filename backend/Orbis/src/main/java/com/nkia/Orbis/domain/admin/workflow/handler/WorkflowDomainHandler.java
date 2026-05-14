package com.nkia.Orbis.domain.admin.workflow.handler;

import com.nkia.Orbis.domain.admin.workflow.entity.WorkflowDomain;

public interface WorkflowDomainHandler {

    WorkflowDomain getDomain();

    void onApproved(Long targetId);

    void onRejected(Long targetId);

    void onCancelled(Long targetId);
}
