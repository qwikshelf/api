package bcrypt

import (
	"golang.org/x/crypto/bcrypt"
)

// Hasher implements password hashing using bcrypt
type Hasher struct {
	cost int
}

// NewHasher creates a new bcrypt hasher
func NewHasher() *Hasher {
	return &Hasher{cost: bcrypt.DefaultCost}
}

// Hash hashes a password using bcrypt
func (h *Hasher) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// Compare compares a password with a hash
func (h *Hasher) Compare(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
