import hashlib
from datetime import date

# ─── 1. Veterinarian License Registry (KSVC) ─────────────────────────────────────────
# Mock registry: license_number → { name, status, state_council, expiry }
VET_LICENSE_REGISTRY = {
    "KSVC.REG.1234": {
        "name": "Dr. Arjun Sharma",
        "status": "active",
        "state_council": "Kerala State Veterinary Council",
        "expiry": "2028-12-31",
        "specialization": "Small Animals",
    },
    "KSVC.REG.56789": {
        "name": "Dr. Priya Nair",
        "status": "active",
        "state_council": "Kerala State Veterinary Council",
        "expiry": "2027-06-15",
        "specialization": "Surgery",
    },
    "KSVC.REG.9999": {
        "name": "Dr. Fake Revoked",
        "status": "suspended",
        "state_council": "Kerala State Veterinary Council",
        "expiry": "2023-01-01",
        "specialization": "N/A",
    },
}


# ─── 2. NGO Darpan Registry (Kerala) ───────────────────────────────────────────────────
# Mock registry: darpan_id → { org_name, status, registration_date, compliance }
NGO_DARPAN_REGISTRY = {
    "KL/2026/0123456": {
        "org_name": "Happy Paws Animal Shelter",
        "status": "active",
        "registration_date": "2020-03-15",
        "compliance": "good_standing",
        "society_act_compliant": True,
        "state": "Kerala",
    },
    "KL/2024/0098765": {
        "org_name": "Kochi Animal Rescue Foundation",
        "status": "active",
        "registration_date": "2018-07-22",
        "compliance": "good_standing",
        "society_act_compliant": True,
        "state": "Kerala",
    },
    "KL/2020/0000001": {
        "org_name": "Revoked Shelter Inc.",
        "status": "revoked",
        "registration_date": "2015-06-01",
        "compliance": "non_compliant",
        "society_act_compliant": False,
        "state": "Kerala",
    },
}


# ─── 3. Municipal Registration Registry (LSGD Kerala) ───────────────────────────────────────
#
MUNICIPAL_REGISTRY = {
    "TVM-CORP-2026-001": {
        "zone": "Thiruvananthapuram Corporation",
        "status": "valid",
        "registered_date": "2026-01-15",
        "expiry_date": "2027-01-15",
    },
    "COCHIN-CORP-2026-04192": {
        "zone": "Kochi Municipal Corporation",
        "status": "valid",
        "registered_date": "2026-06-20",
        "expiry_date": "2027-06-20",
    },
    "KOZ-CORP-2024-003": {
        "zone": "Kozhikode Corporation",
        "status": "valid",
        "registered_date": "2024-03-10",
        "expiry_date": "2025-03-10",
    },
    "KOL-CORP-2026-001": {
        "zone": "Kollam Corporation",
        "status": "valid",
        "registered_date": "2026-02-10",
        "expiry_date": "2027-02-10",
    },
    "THR-CORP-2026-001": {
        "zone": "Thrissur Corporation",
        "status": "valid",
        "registered_date": "2026-03-10",
        "expiry_date": "2027-03-10",
    },
    "KAN-CORP-2026-001": {
        "zone": "Kannur Corporation",
        "status": "valid",
        "registered_date": "2026-04-10",
        "expiry_date": "2027-04-10",
    },
}


def verify_vet_license(license_number):
    """
    Look up a KSVC veterinarian license number against the mock registry.
    Returns (is_valid, details_dict).
    """
    cleaned = license_number.strip().upper()
    entry = VET_LICENSE_REGISTRY.get(cleaned)

    if entry is None:
        return False, {"error": "KSVC_REGISTRATION_INVALID", "message": "License number not found in the KSVC Master Registry."}

    if entry["status"] != "active":
        return False, {
            "error": "KSVC_REGISTRATION_INVALID",
            "message": f"License is {entry['status']}. Contact KSVC for reinstatement.",
            "status": entry["status"],
        }

    return True, {
        "status": "AUTHENTICATED",
        "name": entry["name"],
        "state_council": entry["state_council"],
        "expiry": entry["expiry"],
        "specialization": entry["specialization"],
    }


def verify_ngo_darpan(darpan_id):
    """
    Look up an NGO Darpan Unique ID against the mock registry for Kerala.
    Returns (is_valid, details_dict).
    """
    cleaned = darpan_id.strip().upper()
    entry = NGO_DARPAN_REGISTRY.get(cleaned)

    if entry is None:
        return False, {"error": "ORGANIZATION_NOT_FOUND", "message": "NGO Darpan ID not found in the regulatory registry."}

    if entry["status"] != "active" or not entry.get("society_act_compliant", False):
        return False, {
            "error": "ORGANIZATION_NON_COMPLIANT",
            "message": f"Organization status: {entry['status']}. Organization is not compliant under the Travancore-Cochin Literary, Scientific and Charitable Societies Registration Act, 1955.",
            "status": entry["status"],
            "compliance": entry["compliance"],
        }

    return True, {
        "status": "VERIFIED",
        "org_name": entry["org_name"],
        "state": entry["state"],
        "compliance": entry["compliance"],
        "registration_date": entry["registration_date"],
    }


def verify_municipal_registration(municipal_id):
    """
    Look up an LSGD Kerala municipal registration token against the mock registry.
    Returns (is_valid, details_dict).
    """
    cleaned = municipal_id.strip().upper()
    entry = MUNICIPAL_REGISTRY.get(cleaned)

    if entry is None:
        return False, {"error": "REGISTRY_NOT_FOUND", "message": "LSGD Municipal registration ID not found."}

    if entry["status"] != "valid":
        return False, {
            "error": "REGISTRATION_LAPSED",
            "message": f"LSGD Municipal registration has {entry['status']}. Annual renewal may be overdue.",
            "status": entry["status"],
            "expiry_date": entry["expiry_date"],
        }

    return True, {
        "status": "VERIFIED",
        "zone": entry["zone"],
        "registered_date": entry["registered_date"],
        "expiry_date": entry["expiry_date"],
    }


def verify_owner_pet_binding(municipal_id, owner_gov_id, vaccination_batch):
    """
    Sequential 3-vector binding verification for Kerala.
    Each check must pass before proceeding to the next.
    
    The owner and vaccination checks are mocked here as pet details are decoupled
    from the municipal registration database.
    """
    cleaned_municipal = municipal_id.strip().upper()
    entry = MUNICIPAL_REGISTRY.get(cleaned_municipal)

    # ─── Query A: Municipal License exists? ───
    if entry is None:
        return False, {
            "error": "REGISTRY_NOT_FOUND",
            "message": "LSGD Municipal License ID not found in the civic database.",
            "failed_vector": 1,
        }

    # ─── Query B: Owner identity check (Mocked) ───
    if not owner_gov_id.strip():
        return False, {
            "error": "IDENTITY_MISMATCH",
            "message": "Owner identification does not match the registered owner for this LSGD license.",
            "failed_vector": 2,
        }

    # ─── Query C: Vaccination batch check (Mocked) ───
    if not vaccination_batch.strip():
        return False, {
            "error": "MEDICAL_BATCH_MISMATCH",
            "message": "Anti-Rabies Vaccine batch serial does not match clinical records for this animal.",
            "failed_vector": 3,
        }

    # All 3 vectors passed
    return True, {
        "status": "BINDING_VERIFIED",
        "message": "All 3 verification vectors confirmed. Owner-Pet binding is secure.",
        "pet_name": "Buddy",
        "zone": entry["zone"],
        "vectors_passed": 3,
    }
