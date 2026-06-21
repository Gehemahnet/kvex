import type { EtherealSubaccount } from "./ethereal.types";

export const decodeEtherealSubaccountName = (value: string): string => {
	if (!value.startsWith("0x")) return value;

	try {
		return Buffer.from(value.slice(2), "hex").toString("utf8").split("\u0000", 1)[0] ?? "";
	} catch {
		return value;
	}
};

export const selectEtherealSubaccount = (
	subaccounts: EtherealSubaccount[],
	name = "primary",
): EtherealSubaccount | undefined => {
	const normalizedName = name.trim().toLowerCase();

	return subaccounts.find((subaccount) =>
		decodeEtherealSubaccountName(subaccount.name).toLowerCase() === normalizedName
	) ?? (subaccounts.length === 1 ? subaccounts[0] : undefined);
};
