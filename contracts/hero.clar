(impl-trait .sip009-trait.sip009-nft-standard)

(define-constant ERR_UNAUTHORIZED u100)
(define-constant ERR_NOT_FOUND u101)
(define-constant ERR_LEVEL_CAP u102)

(define-data-var next-id uint u0)

(define-map hero-owners
  ((id uint)) 
  (owner principal)
)

(define-map hero-metadata
  ((id uint)) 
  (tuple
    (name (buff 32))
    (class (string-ascii 16))
    (level uint)
    (xp uint)
    (uri (buff 256))
  )
)

(define-map approved-transfer
  ((id uint)) 
  (approved principal)
)

(define-read-only (get-last-id)
  (ok (var-get next-id))
)

(define-read-only (get-owner (id uint))
  (match (map-get hero-owners ((id id)))
    hero-owner (ok (some hero-owner))
    (err ERR_NOT_FOUND)
  )
)

(define-read-only (get-hero (id uint))
  (match (map-get hero-metadata ((id id)))
    meta (ok meta)
    (err ERR_NOT_FOUND)
  )
)

(define-read-only (get-approved (id uint))
  (match (map-get approved-transfer ((id id)))
    approved (ok (some approved))
    (ok none)
  )
)

(define-public (mint-hero (recipient principal) (name (buff 32)) (class (string-ascii 16)) (uri (buff 256)))
  (begin
    (let ((id (var-get next-id)))
      (map-set hero-owners ((id id)) recipient)
      (map-set hero-metadata ((id id))
        (tuple
          (name name)
          (class class)
          (level u1)
          (xp u0)
          (uri uri)
        )
      )
      (var-set next-id (+ id u1))
      (ok id)
    )
  )
)

(define-public (transfer (id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) (err ERR_UNAUTHORIZED))
    (match (map-get hero-owners ((id id)))
      owner
        (begin
          (asserts! (is-eq owner sender) (err ERR_UNAUTHORIZED))
          (map-set hero-owners ((id id)) recipient)
          (ok true)
        )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (approve (id uint) (to principal))
  (begin
    (match (map-get hero-owners ((id id)))
      owner
        (begin
          (asserts! (is-eq tx-sender owner) (err ERR_UNAUTHORIZED))
          (map-set approved-transfer ((id id)) to)
          (ok true)
        )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (transfer-from (id uint) (from principal) (to principal))
  (begin
    (match (map-get approved-transfer ((id id)))
      approved
        (begin
          (asserts! (is-eq approved tx-sender) (err ERR_UNAUTHORIZED))
          (map-set hero-owners ((id id)) to)
          (map-delete approved-transfer ((id id)))
          (ok true)
        )
      (ok none) (err ERR_UNAUTHORIZED)
    )
  )
)

(define-public (add-xp (id uint) (amount uint))
  (let ((meta (unwrap! (map-get hero-metadata ((id id))) (err ERR_NOT_FOUND))))
    (let ((new-xp (+ (get xp meta) amount)))
      (map-set hero-metadata ((id id))
        (tuple
          (name (get name meta))
          (class (get class meta))
          (level (get level meta))
          (xp new-xp)
          (uri (get uri meta))
        )
      )
      (ok new-xp)
    )
  )
)

(define-public (level-up (id uint))
  (let ((owner (unwrap! (map-get hero-owners ((id id))) (err ERR_NOT_FOUND))))
    (asserts! (is-eq tx-sender owner) (err ERR_UNAUTHORIZED))
    (let ((meta (unwrap! (map-get hero-metadata ((id id))) (err ERR_NOT_FOUND))))
      (let ((xp-needed (* (get level meta) u100)))
        (asserts! (>= (get xp meta) xp-needed) (err ERR_LEVEL_CAP))
        (let ((new-level (+ (get level meta) u1)))
          (let ((new-xp (- (get xp meta) xp-needed)))
            (map-set hero-metadata ((id id))
              (tuple
                (name (get name meta))
                (class (get class meta))
                (level new-level)
                (xp new-xp)
                (uri (get uri meta))
              )
            )
            (ok new-level)
          )
        )
      )
    )
  )
)
