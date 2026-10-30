# Responsible AI, Privacy & Constitutional Governance Framework

Suraksha360 is engineered under a strict "Responsible-by-Design" architecture. In law enforcement contexts, machine learning applications must adhere to constitutional protections, procedural fairness, and data privacy safeguards.

---

## 1. Absolute Prohibition of Individual Profiling

1. **No Personal Profiling:** Suraksha360 contains no functionality to score, predict, classify, or track individual persons, suspects, or citizens.
2. **No Facial Recognition or Biometrics:** Biometric images, social media scrapers, and person-centric facial recognition modules are strictly excluded from the codebase.
3. **500m Geographic Bounding:** All machine learning models operate solely at the aggregate spatial cell level ($500 \times 500\text{ meters}$).
4. **Non-Accusatory Nature:** A high-risk cell prediction denotes only that preventive visibility (e.g. stationary patrol presence or merchant security checks) may be beneficial. It does NOT constitute reasonable suspicion, probable cause, or evidence of guilt regarding any person in that area.

---

## 2. Mandatory Human-in-the-Loop Protocol

1. **Advisory Intelligence Only:** All algorithmic outputs—including patrol routes, priority scores, and resource allocations—are classified as **advisory decision support**.
2. **Officer Authority:** The Control Room Officer or Beat Officer retains full sovereign discretion to:
   - Accept the generated patrol route.
   - Modify waypoints or routes.
   - Reject the recommendation with a required operational rationale.
3. **Immutable Compliance Logging:** All human overrides, approvals, and rejections are immutably logged into the `audit_logs` table with officer identity, timestamp, and justification notes.

---

## 3. The Self-Fulfilling Patrol Trap & Bias Mitigation

### The Feedback-Loop Phenomenon
A recognized pitfall in predictive policing is the **"feedback loop"**:
$$\text{More Patrols} \longrightarrow \text{More Minor Infractions Detected} \longrightarrow \text{Higher Risk Score} \longrightarrow \text{Even More Patrols}$$

If left unchecked, predictive models artificially concentrate police presence in historically over-policed neighborhoods while starving under-reported areas of preventive safety.

### Suraksha360 Technical Mitigations:
1. **Citizen-Initiated Emergency Calls Primary:** The prioritization and risk models give higher weight to citizen-initiated 112 distress calls over officer-initiated proactive stops.
2. **Baseline Minimum Beat Allocation:** The resource allocation engine enforces a minimum floor (at least 1 dedicated motorcycle unit) across all beats regardless of statistical density, ensuring baseline public safety equity across the entire city.
3. **Temporal Normalization:** Incidents are normalized across multi-day rolling windows (7d, 30d, 90d) to prevent single-event spikes from distorting neighborhood risk scores.
4. **Coverage Dispersion Check:** The model lifecycle monitor evaluates geographic entropy across beats and alerts analysts if model predictions concentrate more than 40% of resources in fewer than 15% of cells.

---

## 4. Cryptographic Privacy & Citizen Data Anonymization

1. **Caller Phone Number Hashing:** On ingest of emergency calls from the Computer-Aided Dispatch (CAD) adapter, caller telephone numbers are converted into irreversible SHA-256 hashes (`caller_phone_hash`). No plaintext phone numbers or citizen names are retained in the database.
2. **Data Minimization:** Only objective geographic coordinates, incident timestamps, category codes, and severity ratings are stored.
3. **No Citizen Emergency Web Portal:** Citizens in life-threatening emergencies must dial **112**. The Suraksha360 web portal is strictly an authorized internal intranet tool for sworn police personnel, preventing dangerous delays where a citizen might mistakenly fill out a web form during an active crime.

---

## 5. Security & System Hardening

- **JWT Authentication:** Stateful user session tokens signed with HMAC-SHA256 and configured with 24-hour expiration.
- **Role-Based Access Control (RBAC):**
  - `Admin`: Full configuration, weight adjustment, and audit log inspection.
  - `Control Room Officer`: Real-time queue ranking, unit dispatching, and emergency analytics.
  - `Beat Officer`: Route inspection, mobile GPS telemetry streaming, and checkpoint filing.
  - `Analyst`: Model performance evaluation, CSV importing, and historical trend auditing.
- **Password Security:** Multi-round bcrypt hashing with automated unique salts.
- **SQL Injection Prevention:** 100% parameterized queries via SQLAlchemy 2.0 ORM.
- **Input Validation:** Strict Pydantic v2 schemas validating bounding coordinates and severity ranges.
