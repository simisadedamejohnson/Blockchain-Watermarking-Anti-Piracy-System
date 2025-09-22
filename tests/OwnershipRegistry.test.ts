 
import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, uintCV, buffCV } from "@stacks/transactions";

const ERR_ALREADY_REGISTERED = 100;
const ERR_NOT_AUTHORIZED = 101;
const ERR_INVALID_HASH = 102;
const ERR_INVALID_TITLE = 103;
const ERR_INVALID_DESCRIPTION = 104;
const ERR_REGISTRATION_FEE_NOT_PAID = 106;
const ERR_INVALID_METADATA = 107;
const ERR_TRANSFER_NOT_ALLOWED = 108;
const ERR_GROUP_NOT_FOUND = 109;
const ERR_INVALID_UPDATE_PARAM = 110;
const ERR_MAX_REGISTRATIONS_EXCEEDED = 111;
const ERR_INVALID_CATEGORY = 112;
const ERR_INVALID_LICENSE_TYPE = 113;
const ERR_INVALID_ROYALTY_RATE = 114;
const ERR_INVALID_EXPIRY = 115;
const ERR_AUTHORITY_NOT_VERIFIED = 116;

interface Registration {
	owner: string;
	title: string;
	description: string;
	timestamp: number;
	id: number;
	category: string;
	licenseType: string;
	royaltyRate: number;
	expiry: number;
	metadata: Uint8Array;
	status: boolean;
	version: number;
}

interface RegistrationUpdate {
	updateTitle: string;
	updateDescription: string;
	updateTimestamp: number;
	updater: string;
	updateCategory: string;
	updateLicenseType: string;
	updateRoyaltyRate: number;
	updateExpiry: number;
	updateMetadata: Uint8Array;
}

interface Result<T> {
	ok: boolean;
	value: T;
}

class OwnershipRegistryMock {
	state: {
		nextRegistrationId: number;
		maxRegistrations: number;
		registrationFee: number;
		authorityContract: string | null;
		ownershipRecords: Map<string, Registration>;
		registrationsById: Map<number, Registration>;
		registrationUpdates: Map<number, RegistrationUpdate>;
	} = {
		nextRegistrationId: 0,
		maxRegistrations: 100000,
		registrationFee: 500,
		authorityContract: null,
		ownershipRecords: new Map(),
		registrationsById: new Map(),
		registrationUpdates: new Map(),
	};
	blockHeight: number = 0;
	caller: string = "ST1TEST";
	stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

	constructor() {
		this.reset();
	}

	reset() {
		this.state = {
			nextRegistrationId: 0,
			maxRegistrations: 100000,
			registrationFee: 500,
			authorityContract: null,
			ownershipRecords: new Map(),
			registrationsById: new Map(),
			registrationUpdates: new Map(),
		};
		this.blockHeight = 0;
		this.caller = "ST1TEST";
		this.stxTransfers = [];
	}

	setAuthorityContract(contractPrincipal: string): Result<boolean> {
		if (contractPrincipal === "SP000000000000000000002Q6VF78") {
			return { ok: false, value: false };
		}
		if (this.state.authorityContract !== null) {
			return { ok: false, value: false };
		}
		this.state.authorityContract = contractPrincipal;
		return { ok: true, value: true };
	}

	setRegistrationFee(newFee: number): Result<boolean> {
		if (!this.state.authorityContract) return { ok: false, value: false };
		this.state.registrationFee = newFee;
		return { ok: true, value: true };
	}

	setMaxRegistrations(newMax: number): Result<boolean> {
		if (!this.state.authorityContract) return { ok: false, value: false };
		this.state.maxRegistrations = newMax;
		return { ok: true, value: true };
	}

	registerContent(
		contentHash: Uint8Array,
		title: string,
		description: string,
		category: string,
		licenseType: string,
		royaltyRate: number,
		expiry: number,
		metadata: Uint8Array
	): Result<number> {
		if (this.state.nextRegistrationId >= this.state.maxRegistrations)
			return { ok: false, value: ERR_MAX_REGISTRATIONS_EXCEEDED };
		if (contentHash.length !== 32)
			return { ok: false, value: ERR_INVALID_HASH };
		if (!title || title.length > 100)
			return { ok: false, value: ERR_INVALID_TITLE };
		if (description.length > 500)
			return { ok: false, value: ERR_INVALID_DESCRIPTION };
		if (!["image", "video", "music", "document"].includes(category))
			return { ok: false, value: ERR_INVALID_CATEGORY };
		if (!["CC-BY", "CC-NC", "proprietary"].includes(licenseType))
			return { ok: false, value: ERR_INVALID_LICENSE_TYPE };
		if (royaltyRate > 50) return { ok: false, value: ERR_INVALID_ROYALTY_RATE };
		if (expiry <= this.blockHeight)
			return { ok: false, value: ERR_INVALID_EXPIRY };
		if (metadata.length > 1024)
			return { ok: false, value: ERR_INVALID_METADATA };
		const hashKey = contentHash.toString();
		if (this.state.ownershipRecords.has(hashKey))
			return { ok: false, value: ERR_ALREADY_REGISTERED };
		if (!this.state.authorityContract)
			return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

		this.stxTransfers.push({
			amount: this.state.registrationFee,
			from: this.caller,
			to: this.state.authorityContract,
		});

		const id = this.state.nextRegistrationId;
		const registration: Registration = {
			owner: this.caller,
			title,
			description,
			timestamp: this.blockHeight,
			id,
			category,
			licenseType,
			royaltyRate,
			expiry,
			metadata,
			status: true,
			version: 1,
		};
		this.state.ownershipRecords.set(hashKey, registration);
		this.state.registrationsById.set(id, registration);
		this.state.nextRegistrationId++;
		return { ok: true, value: id };
	}

	getRegistration(hash: Uint8Array): Registration | null {
		return this.state.ownershipRecords.get(hash.toString()) || null;
	}

	getRegistrationById(id: number): Registration | null {
		return this.state.registrationsById.get(id) || null;
	}

	updateRegistration(
		regId: number,
		updateTitle: string,
		updateDescription: string,
		updateCategory: string,
		updateLicenseType: string,
		updateRoyaltyRate: number,
		updateExpiry: number,
		updateMetadata: Uint8Array
	): Result<boolean> {
		const reg = this.state.registrationsById.get(regId);
		if (!reg) return { ok: false, value: false };
		if (reg.owner !== this.caller) return { ok: false, value: false };
		if (!updateTitle || updateTitle.length > 100)
			return { ok: false, value: false };
		if (updateDescription.length > 500) return { ok: false, value: false };
		if (!["image", "video", "music", "document"].includes(updateCategory))
			return { ok: false, value: false };
		if (!["CC-BY", "CC-NC", "proprietary"].includes(updateLicenseType))
			return { ok: false, value: false };
		if (updateRoyaltyRate > 50) return { ok: false, value: false };
		if (updateExpiry <= this.blockHeight) return { ok: false, value: false };
		if (updateMetadata.length > 1024) return { ok: false, value: false };

		const updated: Registration = {
			...reg,
			title: updateTitle,
			description: updateDescription,
			timestamp: this.blockHeight,
			category: updateCategory,
			licenseType: updateLicenseType,
			royaltyRate: updateRoyaltyRate,
			expiry: updateExpiry,
			metadata: updateMetadata,
			version: reg.version + 1,
		};
		this.state.ownershipRecords.set(reg.contentHash.toString(), updated);
		this.state.registrationsById.set(regId, updated);
		this.state.registrationUpdates.set(regId, {
			updateTitle,
			updateDescription,
			updateTimestamp: this.blockHeight,
			updater: this.caller,
			updateCategory,
			updateLicenseType,
			updateRoyaltyRate,
			updateExpiry,
			updateMetadata,
		});
		return { ok: true, value: true };
	}

	transferOwnership(regId: number, newOwner: string): Result<boolean> {
		const reg = this.state.registrationsById.get(regId);
		if (!reg) return { ok: false, value: false };
		if (reg.owner !== this.caller) return { ok: false, value: false };
		if (newOwner === "SP000000000000000000002Q6VF78")
			return { ok: false, value: false };

		const updated: Registration = { ...reg, owner: newOwner };
		this.state.ownershipRecords.set(reg.contentHash.toString(), updated);
		this.state.registrationsById.set(regId, updated);
		return { ok: true, value: true };
	}

	deactivateRegistration(regId: number): Result<boolean> {
		const reg = this.state.registrationsById.get(regId);
		if (!reg) return { ok: false, value: false };
		if (reg.owner !== this.caller) return { ok: false, value: false };

		const updated: Registration = { ...reg, status: false };
		this.state.ownershipRecords.set(reg.contentHash.toString(), updated);
		this.state.registrationsById.set(regId, updated);
		return { ok: true, value: true };
	}

	getRegistrationCount(): Result<number> {
		return { ok: true, value: this.state.nextRegistrationId };
	}

	verifyOwnership(hash: Uint8Array, claimer: string): Result<boolean> {
		const reg = this.state.ownershipRecords.get(hash.toString());
		if (!reg) return { ok: false, value: false };
		return { ok: true, value: reg.owner === claimer && reg.status };
	}
}

describe("OwnershipRegistry", () => {
	let contract: OwnershipRegistryMock;

	beforeEach(() => {
		contract = new OwnershipRegistryMock();
		contract.reset();
	});

	it("registers content successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash = new Uint8Array(32).fill(1);
		const result = contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(0);

		const reg = contract.getRegistration(hash);
		expect(reg?.title).toBe("Title");
		expect(reg?.category).toBe("image");
		expect(reg?.royaltyRate).toBe(10);
		expect(reg?.status).toBe(true);
		expect(contract.stxTransfers).toEqual([
			{ amount: 500, from: "ST1TEST", to: "ST2TEST" },
		]);
	});

	it("rejects duplicate registrations", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash = new Uint8Array(32).fill(1);
		contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		const result = contract.registerContent(
			hash,
			"NewTitle",
			"NewDesc",
			"video",
			"CC-NC",
			20,
			200000,
			new Uint8Array(20)
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_ALREADY_REGISTERED);
	});

	it("rejects registration without authority", () => {
		const hash = new Uint8Array(32).fill(1);
		const result = contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
	});

	it("rejects invalid hash", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash = new Uint8Array(31);
		const result = contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		expect(result.ok).toBe(false);
		expect(result.value).toBe(ERR_INVALID_HASH);
	});

	it("rejects update by non-owner", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash = new Uint8Array(32).fill(1);
		contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		contract.caller = "ST3FAKE";
		const result = contract.updateRegistration(
			0,
			"NewTitle",
			"NewDesc",
			"video",
			"CC-NC",
			20,
			200000,
			new Uint8Array(20)
		);
		expect(result.ok).toBe(false);
	});

	it("verifies ownership correctly", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash = new Uint8Array(32).fill(1);
		contract.registerContent(
			hash,
			"Title",
			"Description",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		const result = contract.verifyOwnership(hash, "ST1TEST");
		expect(result.ok).toBe(true);
		expect(result.value).toBe(true);
		const result2 = contract.verifyOwnership(hash, "ST5WRONG");
		expect(result2.ok).toBe(true);
		expect(result2.value).toBe(false);
	});

	it("sets registration fee successfully", () => {
		contract.setAuthorityContract("ST2TEST");
		const result = contract.setRegistrationFee(1000);
		expect(result.ok).toBe(true);
		expect(contract.state.registrationFee).toBe(1000);
	});

	it("gets registration count", () => {
		contract.setAuthorityContract("ST2TEST");
		const hash1 = new Uint8Array(32).fill(1);
		const hash2 = new Uint8Array(32).fill(2);
		contract.registerContent(
			hash1,
			"Title1",
			"Desc1",
			"image",
			"CC-BY",
			10,
			100000,
			new Uint8Array(10)
		);
		contract.registerContent(
			hash2,
			"Title2",
			"Desc2",
			"video",
			"CC-NC",
			20,
			200000,
			new Uint8Array(20)
		);
		const result = contract.getRegistrationCount();
		expect(result.ok).toBe(true);
		expect(result.value).toBe(2);
	});
});