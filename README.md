# 🔒 Blockchain Watermarking Anti-Piracy System

Welcome to an innovative anti-piracy platform built on the Stacks blockchain! This project addresses the rampant issue of digital content piracy by enabling creators to embed invisible, blockchain-verified watermarks into their media (like images, videos, music, or documents). These watermarks serve as tamper-proof signatures linked to on-chain ownership proofs, allowing instant verification, automated royalty tracking, and dispute resolution. Say goodbye to unauthorized distribution—empower creators to protect and monetize their work securely.

## ✨ Features

🔑 Register content ownership with cryptographic hashes  
🖼️ Generate and embed unique blockchain-based watermarks  
✅ Verify watermarks against on-chain records in real-time  
💰 Automate royalty distributions for licensed usage  
⚖️ Resolve ownership disputes through decentralized voting  
📊 Track content usage and piracy attempts via immutable logs  
🚫 Blacklist detected pirated content hashes  
👥 Manage user roles (creators, verifiers, licensees) with secure authentication  
💸 Integrated token system for platform fees and incentives  

## 🛠 How It Works

This system leverages 8 smart contracts written in Clarity to create a robust, decentralized anti-piracy ecosystem. Creators can watermark their content off-chain (using tools like steganography libraries) with signatures generated on-chain, while verifiers extract and check these signatures against the blockchain for authenticity.

**For Creators**  
- Compute a SHA-256 hash of your digital content.  
- Register the hash via the OwnershipRegistry contract to claim ownership.  
- Use the WatermarkGenerator contract to create a unique signature (e.g., a verifiable random function-based watermark).  
- Embed the watermark into your content (off-chain).  
- Optionally, set up licenses in the LicenseManager contract for authorized sharing with royalties.  
- If piracy is detected, initiate a dispute via DisputeResolution.  

Boom! Your content is now protected with an invisible, blockchain-backed signature that proves origin and deters theft.

**For Verifiers (e.g., Platforms, Buyers, or Anti-Piracy Agencies)**  
- Extract the embedded watermark from suspected content (off-chain).  
- Query the SignatureVerifier contract with the watermark and content hash to confirm ownership.  
- Check usage logs in the AuditLogger for any unauthorized activity.  
- If valid, royalties can be triggered automatically via RoyaltyDistributor.  

Instant verification helps platforms like streaming services or marketplaces enforce IP rights without centralized gatekeepers.

**For Licensees**  
- Purchase or request licenses through LicenseManager.  
- Use verified content without fear of infringement, with royalties flowing back to creators seamlessly.

**Smart Contracts Overview**  
The project is composed of the following 8 Clarity smart contracts, each handling a specific aspect for modularity and security:  
1. **OwnershipRegistry**: Registers content hashes, timestamps ownership claims, and prevents duplicates.  
2. **WatermarkGenerator**: Generates unique, verifiable watermarks using on-chain randomness and signatures.  
3. **SignatureVerifier**: Validates extracted watermarks against registered hashes and ownership data.  
4. **LicenseManager**: Manages creation, transfer, and revocation of content licenses.  
5. **RoyaltyDistributor**: Handles automated royalty payments based on usage proofs or license terms (e.g., via STX tokens).  
6. **DisputeResolution**: Facilitates decentralized arbitration for ownership conflicts, with community or oracle voting.  
7. **AuditLogger**: Logs all registrations, verifications, and disputes for transparent auditing.  
8. **UserRoles**: Manages authentication and permissions for creators, verifiers, and other roles to ensure secure interactions.  

These contracts interact seamlessly (e.g., WatermarkGenerator calls OwnershipRegistry to check prior claims), forming a complete anti-piracy protocol. Deploy them on Stacks for Bitcoin-secured immutability!