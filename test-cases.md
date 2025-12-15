# 🧪 System Test Cases
**Project:** Secure & Share Govt Documents
**Tester:** Developer
**Date:** 2025-12-15

---

## 🔐 1. Authentication Module
| ID | Test Scenario | Input Data | Expected Result | Status |
|----|---------------|------------|-----------------|--------|
| **T01** | Login with valid phone | `9999999999` / `123456` | Redirect to Dashboard | ✅ Pass |
| **T02** | Login with invalid OTP | `9999999999` / `000000` | Alert: "Invalid OTP" | ✅ Pass |
| **T03** | Login with Short Number | `98765` | Alert: "Enter valid 10-digit number" | ✅ Pass |
| **T04** | Session Persistence | Close & Reopen Tab | User remains logged in | ✅ Pass |

## 📂 2. Document Management
| ID | Test Scenario | Input Data | Expected Result | Status |
|----|---------------|------------|-----------------|--------|
| **T05** | Upload Valid File | `Aadhaar.pdf` (<500KB) | Success message + Appears on Dashboard | ✅ Pass |
| **T06** | Upload Large File | `Movie.mp4` (>1MB) | Error: "File too large" | ✅ Pass |
| **T07** | Upload Empty/No File | Click Upload without file | Alert: "Please select file" | ✅ Pass |
| **T08** | Delete Document | Click Delete on Doc A | Doc A removed from list immediately | ✅ Pass |

## 🤝 3. Sharing System
| ID | Test Scenario | Input Data | Expected Result | Status |
|----|---------------|------------|-----------------|--------|
| **T09** | Share with Valid User | Receiver: `8888888888` | Success: "Shared Successfully" | ✅ Pass |
| **T10** | Share with Self | Receiver: `<My Own Number>` | Error: "Cannot share with yourself" | ✅ Pass |
| **T11** | Share with Invalid Format| Receiver: `123` | Error: "Enter valid 10-digit number" | ✅ Pass |
| **T12** | Receiver Access | Login as `8888888888` | Shared doc appears with "SHARED WITH ME" badge | ✅ Pass |
| **T13** | Receiver Delete | Receiver clicks Delete | Error or Button Hidden (Receiver cannot delete) | ✅ Pass |

## 👤 4. Profile & Security
| ID | Test Scenario | Input Data | Expected Result | Status |
|----|---------------|------------|-----------------|--------|
| **T14** | Update Profile Name | Name: "Laksh" | "Profile Updated" & Saved in DB | ✅ Pass |
| **T15** | View Audit Logs | Go to Activity Page | Table shows recent Login/Upload actions | ✅ Pass |
| **T16** | SQL/NoSQL Injection | Phone: `' OR '1'='1` | Input Sanitized / Auth Fails | ✅ Pass |