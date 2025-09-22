(define-constant ERR-ALREADY-REGISTERED u100)
(define-constant ERR-NOT-AUTHORIZED u101)
(define-constant ERR-INVALID-HASH u102)
(define-constant ERR-INVALID-TITLE u103)
(define-constant ERR-INVALID-DESCRIPTION u104)
(define-constant ERR-INVALID-TIMESTAMP u105)
(define-constant ERR-REGISTRATION-FEE-NOT-PAID u106)
(define-constant ERR-INVALID-METADATA u107)
(define-constant ERR-TRANSFER-NOT-ALLOWED u108)
(define-constant ERR-GROUP-NOT-FOUND u109)
(define-constant ERR-INVALID-UPDATE-PARAM u110)
(define-constant ERR-MAX-REGISTRATIONS-EXCEEDED u111)
(define-constant ERR-INVALID-CATEGORY u112)
(define-constant ERR-INVALID-LICENSE-TYPE u113)
(define-constant ERR-INVALID-ROYALTY-RATE u114)
(define-constant ERR-INVALID-EXPIRY u115)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-VERSION u120)

(define-data-var next-registration-id uint u0)
(define-data-var max-registrations uint u100000)
(define-data-var registration-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map OwnershipRecords
  { content-hash: (buff 32) }
  { owner: principal, title: (string-ascii 100), description: (string-ascii 500), timestamp: uint, id: uint, category: (string-ascii 50), license-type: (string-ascii 50), royalty-rate: uint, expiry: uint, metadata: (buff 1024), status: bool, version: uint }
)

(define-map RegistrationsById
  uint
  { content-hash: (buff 32), owner: principal, title: (string-ascii 100), description: (string-ascii 500), timestamp: uint, category: (string-ascii 50), license-type: (string-ascii 50), royalty-rate: uint, expiry: uint, metadata: (buff 1024), status: bool, version: uint }
)

(define-map RegistrationUpdates
  uint
  { update-title: (string-ascii 100), update-description: (string-ascii 500), update-timestamp: uint, updater: principal, update-category: (string-ascii 50), update-license-type: (string-ascii 50), update-royalty-rate: uint, update-expiry: uint, update-metadata: (buff 1024) }
)

(define-read-only (get-registration (hash (buff 32)))
  (map-get? OwnershipRecords { content-hash: hash })
)

(define-read-only (get-registration-by-id (id uint))
  (map-get? RegistrationsById id)
)

(define-read-only (get-registration-updates (id uint))
  (map-get? RegistrationUpdates id)
)

(define-read-only (is-registered (hash (buff 32)))
  (is-some (map-get? OwnershipRecords { content-hash: hash }))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-title (title (string-ascii 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-TITLE))
)

(define-private (validate-description (desc (string-ascii 500)))
  (if (<= (len desc) u500)
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (or (is-eq cat "image") (is-eq cat "video") (is-eq cat "music") (is-eq cat "document"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-license-type (lic (string-ascii 50)))
  (if (or (is-eq lic "CC-BY") (is-eq lic "CC-NC") (is-eq lic "proprietary"))
      (ok true)
      (err ERR-INVALID-LICENSE-TYPE))
)

(define-private (validate-royalty-rate (rate uint))
  (if (<= rate u50)
      (ok true)
      (err ERR-INVALID-ROYALTY-RATE))
)

(define-private (validate-expiry (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-metadata (meta (buff 1024)))
  (if (<= (len meta) u1024)
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-registrations (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-REGISTRATIONS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-registrations new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-content
  (content-hash (buff 32))
  (title (string-ascii 100))
  (description (string-ascii 500))
  (category (string-ascii 50))
  (license-type (string-ascii 50))
  (royalty-rate uint)
  (expiry uint)
  (metadata (buff 1024))
)
  (let (
        (next-id (var-get next-registration-id))
        (current-max (var-get max-registrations))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-REGISTRATIONS-EXCEEDED))
    (try! (validate-hash content-hash))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-category category))
    (try! (validate-license-type license-type))
    (try! (validate-royalty-rate royalty-rate))
    (try! (validate-expiry expiry))
    (try! (validate-metadata metadata))
    (asserts! (is-none (map-get? OwnershipRecords { content-hash: content-hash })) (err ERR-ALREADY-REGISTERED))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (map-set OwnershipRecords { content-hash: content-hash }
      { owner: tx-sender, title: title, description: description, timestamp: block-height, id: next-id, category: category, license-type: license-type, royalty-rate: royalty-rate, expiry: expiry, metadata: metadata, status: true, version: u1 }
    )
    (map-set RegistrationsById next-id
      { content-hash: content-hash, owner: tx-sender, title: title, description: description, timestamp: block-height, category: category, license-type: license-type, royalty-rate: royalty-rate, expiry: expiry, metadata: metadata, status: true, version: u1 }
    )
    (var-set next-registration-id (+ next-id u1))
    (print { event: "content-registered", id: next-id, hash: content-hash })
    (ok next-id)
  )
)

(define-public (update-registration
  (reg-id uint)
  (update-title (string-ascii 100))
  (update-description (string-ascii 500))
  (update-category (string-ascii 50))
  (update-license-type (string-ascii 50))
  (update-royalty-rate uint)
  (update-expiry uint)
  (update-metadata (buff 1024))
)
  (let ((reg (map-get? RegistrationsById reg-id)))
    (match reg
      r
        (begin
          (asserts! (is-eq (get owner r) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-title update-title))
          (try! (validate-description update-description))
          (try! (validate-category update-category))
          (try! (validate-license-type update-license-type))
          (try! (validate-royalty-rate update-royalty-rate))
          (try! (validate-expiry update-expiry))
          (try! (validate-metadata update-metadata))
          (map-set OwnershipRecords { content-hash: (get content-hash r) }
            { owner: (get owner r), title: update-title, description: update-description, timestamp: block-height, id: reg-id, category: update-category, license-type: update-license-type, royalty-rate: update-royalty-rate, expiry: update-expiry, metadata: update-metadata, status: (get status r), version: (+ (get version r) u1) }
          )
          (map-set RegistrationsById reg-id
            { content-hash: (get content-hash r), owner: (get owner r), title: update-title, description: update-description, timestamp: block-height, category: update-category, license-type: update-license-type, royalty-rate: update-royalty-rate, expiry: update-expiry, metadata: update-metadata, status: (get status r), version: (+ (get version r) u1) }
          )
          (map-set RegistrationUpdates reg-id
            { update-title: update-title, update-description: update-description, update-timestamp: block-height, updater: tx-sender, update-category: update-category, update-license-type: update-license-type, update-royalty-rate: update-royalty-rate, update-expiry: update-expiry, update-metadata: update-metadata }
          )
          (print { event: "registration-updated", id: reg-id })
          (ok true)
        )
      (err ERR-GROUP-NOT-FOUND)
    )
  )
)

(define-public (transfer-ownership (reg-id uint) (new-owner principal))
  (let ((reg (map-get? RegistrationsById reg-id)))
    (match reg
      r
        (begin
          (asserts! (is-eq (get owner r) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-principal new-owner))
          (map-set OwnershipRecords { content-hash: (get content-hash r) }
            { owner: new-owner, title: (get title r), description: (get description r), timestamp: (get timestamp r), id: reg-id, category: (get category r), license-type: (get license-type r), royalty-rate: (get royalty-rate r), expiry: (get expiry r), metadata: (get metadata r), status: (get status r), version: (get version r) }
          )
          (map-set RegistrationsById reg-id
            { content-hash: (get content-hash r), owner: new-owner, title: (get title r), description: (get description r), timestamp: (get timestamp r), category: (get category r), license-type: (get license-type r), royalty-rate: (get royalty-rate r), expiry: (get expiry r), metadata: (get metadata r), status: (get status r), version: (get version r) }
          )
          (print { event: "ownership-transferred", id: reg-id, new-owner: new-owner })
          (ok true)
        )
      (err ERR-GROUP-NOT-FOUND)
    )
  )
)

(define-public (deactivate-registration (reg-id uint))
  (let ((reg (map-get? RegistrationsById reg-id)))
    (match reg
      r
        (begin
          (asserts! (is-eq (get owner r) tx-sender) (err ERR-NOT-AUTHORIZED))
          (map-set OwnershipRecords { content-hash: (get content-hash r) }
            { owner: (get owner r), title: (get title r), description: (get description r), timestamp: (get timestamp r), id: reg-id, category: (get category r), license-type: (get license-type r), royalty-rate: (get royalty-rate r), expiry: (get expiry r), metadata: (get metadata r), status: false, version: (get version r) }
          )
          (map-set RegistrationsById reg-id
            { content-hash: (get content-hash r), owner: (get owner r), title: (get title r), description: (get description r), timestamp: (get timestamp r), category: (get category r), license-type: (get license-type r), royalty-rate: (get royalty-rate r), expiry: (get expiry r), metadata: (get metadata r), status: false, version: (get version r) }
          )
          (print { event: "registration-deactivated", id: reg-id })
          (ok true)
        )
      (err ERR-GROUP-NOT-FOUND)
    )
  )
)

(define-public (get-registration-count)
  (ok (var-get next-registration-id))
)

(define-public (verify-ownership (content-hash (buff 32)) (claimer principal))
  (match (map-get? OwnershipRecords { content-hash: content-hash })
    record (ok (and (is-eq (get owner record) claimer) (get status record)))
    (err ERR-GROUP-NOT-FOUND)
  )
)

(define-read-only (get-authority-contract)
  (var-get authority-contract)
)

(define-read-only (get-registration-fee)
  (var-get registration-fee)
)

(define-read-only (get-max-registrations)
  (var-get max-registrations)
)  
