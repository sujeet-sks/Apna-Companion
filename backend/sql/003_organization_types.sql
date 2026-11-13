BEGIN;

ALTER TABLE organizations
    DROP CONSTRAINT IF EXISTS organizations_organization_type_check;

ALTER TABLE organizations
    ADD CONSTRAINT organizations_organization_type_check
    CHECK (organization_type IN (
        'bank', 'hospital', 'rto', 'ngo', 'municipal_corporation',
        'district_collector_office', 'pension_office', 'passport_seva_kendra',
        'aadhaar_seva_kendra', 'post_office', 'electricity_board_office',
        'water_supply_office', 'gas_distribution_office', 'school',
        'college_university', 'police_station', 'court_legal_aid_centre', 'others'
    ));

COMMIT;
