import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ImagePlus, Save } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useSettings } from "../context/SettingsContext";

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_PROFILE_IMAGE_DIMENSION = 384;
const PROFILE_IMAGE_QUALITY = 0.82;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]);

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read the selected image file."));
    reader.readAsDataURL(file);
});

const optimizeImageDataUrl = (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
        const longestSide = Math.max(image.width, image.height) || 1;
        const scale = Math.min(1, MAX_PROFILE_IMAGE_DIMENSION / longestSide);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
            reject(new Error("Could not process the selected image."));
            return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", PROFILE_IMAGE_QUALITY));
    };
    image.onerror = () => reject(new Error("Could not process the selected image."));
    image.src = dataUrl;
});

const isQuotaExceededError = (error) => {
    if (!error) return false;
    const name = String(error.name || "");
    const message = String(error.message || "");
    return name === "QuotaExceededError"
        || name === "NS_ERROR_DOM_QUOTA_REACHED"
        || message.toLowerCase().includes("quota");
};

export default function Settings() {
    const location = useLocation();
    const { apiFetch, refreshUser, user } = useAuth();
    const { dataSource, setDataSource, clientProfile, setClientProfile } = useSettings();
    const [formData, setFormData] = useState(clientProfile);
    const [statusMessage, setStatusMessage] = useState("");
    const [approvalStatus, setApprovalStatus] = useState(user?.approvalStatus || "approved");
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const showOnboardingIntro = Boolean(location.state?.fromSignup || location.state?.approvalRequired);
    const userId = String(user?.id || "");
    const userRole = String(user?.role || "");
    const userApprovalStatus = String(user?.approvalStatus || "");

    useEffect(() => {
        setDataSource("n8n-server");
    }, [setDataSource]);

    useEffect(() => {
        setFormData(clientProfile);
    }, [clientProfile]);

    useEffect(() => {
        setApprovalStatus(userApprovalStatus || "approved");
    }, [userApprovalStatus]);

    useEffect(() => {
        let mounted = true;

        const loadProfile = async () => {
            if (!userId || userRole === "admin") {
                if (mounted) setIsProfileLoading(false);
                return;
            }

            setIsProfileLoading(true);
            try {
                const response = await apiFetch("/api/client/settings", {
                    headers: { Accept: "application/json" },
                });
                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload?.error || "Failed to load onboarding profile");
                }

                const payload = await response.json();
                const profile = payload?.profile || {};
                if (!mounted) return;
                setFormData(profile);
                setClientProfile(profile);
                setApprovalStatus(payload?.approvalStatus || userApprovalStatus || "pending");
            } catch (error) {
                if (!mounted) return;
                setStatusMessage(error?.message || "Could not load onboarding details. Please try again.");
            } finally {
                if (mounted) setIsProfileLoading(false);
            }
        };

        void loadProfile();
        return () => {
            mounted = false;
        };
    }, [apiFetch, setClientProfile, userId, userRole, userApprovalStatus]);

    const normalizedFormData = useMemo(() => ({
        clientName: String(formData?.clientName || ""),
        contactNumber: String(formData?.contactNumber || ""),
        businessName: String(formData?.businessName || ""),
        primaryEmail: String(formData?.primaryEmail || ""),
        secondaryEmail: String(formData?.secondaryEmail || ""),
        profileImage: String(formData?.profileImage || ""),
    }), [formData]);

    const isFormValid = useMemo(() => {
        const primary = normalizedFormData.primaryEmail.trim().toLowerCase();
        const secondary = normalizedFormData.secondaryEmail.trim().toLowerCase();
        return (
            Boolean(normalizedFormData.clientName.trim())
            && Boolean(normalizedFormData.contactNumber.trim())
            && Boolean(normalizedFormData.businessName.trim())
            && Boolean(primary)
            && Boolean(secondary)
            && primary !== secondary
            && Boolean(normalizedFormData.profileImage)
        );
    }, [normalizedFormData]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setStatusMessage("");
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleImageChange = async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;

        setStatusMessage("");

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setStatusMessage("Please upload a PNG, JPG, WebP, or GIF image.");
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setStatusMessage("Image is too large. Please upload an image smaller than 2 MB.");
            return;
        }

        try {
            const rawDataUrl = await fileToDataUrl(file);
            const optimizedDataUrl = await optimizeImageDataUrl(rawDataUrl);
            setFormData((previous) => ({ ...previous, profileImage: optimizedDataUrl }));
            setStatusMessage("Image added. Click Save Profile to persist details.");
        } catch {
            setStatusMessage("Could not process the selected image. Please try another one.");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isFormValid) {
            setStatusMessage("Please complete all mandatory profile fields. Primary and secondary emails must be different.");
            return;
        }

        const sanitizedProfile = {
            clientName: normalizedFormData.clientName.trim(),
            contactNumber: normalizedFormData.contactNumber.trim(),
            businessName: normalizedFormData.businessName.trim(),
            primaryEmail: normalizedFormData.primaryEmail.trim(),
            secondaryEmail: normalizedFormData.secondaryEmail.trim(),
            profileImage: normalizedFormData.profileImage,
        };

        const primaryEmail = sanitizedProfile.primaryEmail.toLowerCase();
        const secondaryEmail = sanitizedProfile.secondaryEmail.toLowerCase();
        if (primaryEmail && secondaryEmail && primaryEmail === secondaryEmail) {
            setStatusMessage("Primary and secondary emails must be different.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await apiFetch("/api/client/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify(sanitizedProfile),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Could not save onboarding profile.");
            }

            const payload = await response.json();
            const savedProfile = payload?.profile || sanitizedProfile;
            setClientProfile(savedProfile);
            setFormData(savedProfile);
            setApprovalStatus(payload?.approvalStatus || "pending");
            await refreshUser().catch(() => null);
            setStatusMessage("");
        } catch (error) {
            if (isQuotaExceededError(error)) {
                setStatusMessage("Browser storage is full. Use a smaller image and try again.");
                return;
            }
            setStatusMessage(error?.message || "Could not save profile details. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {showOnboardingIntro ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
                    <h2 className="text-sm font-semibold text-cyan-200">Onboarding Required</h2>
                    <p className="text-xs text-cyan-100/80">
                        Complete and save your profile details. Root admin approval is required before dashboard access is enabled.
                    </p>
                </div>
            ) : null}

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-semibold text-emerald-300">Live n8n Mode</h2>
                    <p className="text-xs text-emerald-200/80">Dashboard is configured to use live n8n server data by default.</p>
                </div>
                <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <BadgeCheck size={14} className="mr-2" />
                    {dataSource}
                </div>
            </div>

            <div className={`rounded-xl border px-4 py-3 ${
                approvalStatus === "approved"
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10"
            }`}>
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Approval Status: {approvalStatus}</h2>
                <p className="text-xs text-gray-300">
                    {approvalStatus === "approved"
                        ? "Your account is approved. Dashboard access is enabled."
                        : "Your account is restricted until root admin approves your signup."}
                </p>
            </div>

            <div className="rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/70 overflow-hidden">
                <div className="border-b border-[var(--c-border-light)] px-6 py-5">
                    <h3 className="text-lg font-bold text-[var(--c-text)]">Client Profile Details</h3>
                    <p className="text-sm text-gray-400">All fields below are mandatory. Saved profile image appears in the top-right header.</p>
                </div>

                {isProfileLoading ? (
                    <div className="p-6 text-sm text-gray-400">Loading onboarding profile...</div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Client Name *</span>
                            <input
                                type="text"
                                name="clientName"
                                required
                                value={normalizedFormData.clientName}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                placeholder="Enter client name"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Contact Number *</span>
                            <input
                                type="tel"
                                name="contactNumber"
                                required
                                value={normalizedFormData.contactNumber}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                placeholder="+1 000 000 0000"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Business Name *</span>
                            <input
                                type="text"
                                name="businessName"
                                required
                                value={normalizedFormData.businessName}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                placeholder="Enter business name"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Primary Email *</span>
                            <input
                                type="email"
                                name="primaryEmail"
                                required
                                value={normalizedFormData.primaryEmail}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                placeholder="primary@business.com"
                            />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Secondary Email *</span>
                            <input
                                type="email"
                                name="secondaryEmail"
                                required
                                value={normalizedFormData.secondaryEmail}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-accent)]/80"
                                placeholder="support@business.com"
                            />
                        </label>
                    </div>

                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-[var(--c-hover)] flex items-center justify-center">
                                {normalizedFormData.profileImage ? (
                                    <img src={normalizedFormData.profileImage} alt="Client profile" className="h-full w-full object-cover" />
                                ) : (
                                    <ImagePlus size={20} className="text-gray-400" />
                                )}
                            </div>

                            <label className="space-y-2 flex-1 min-w-[240px]">
                                <span className="text-sm font-medium text-[var(--c-text-dim)]">Profile Image *</span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={handleImageChange}
                                    required={!normalizedFormData.profileImage}
                                    className="block w-full cursor-pointer rounded-lg border border-[var(--c-border-light)] bg-[var(--c-surface)] px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--c-accent)]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--c-accent)]"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">Mandatory fields are marked with *</p>
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-lg bg-[var(--c-accent)] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[var(--c-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!isFormValid || isSaving || isProfileLoading}
                        >
                            <Save size={16} className="mr-2" />
                            {isSaving ? "Saving..." : "Save Profile"}
                        </button>
                    </div>

                    {statusMessage && (
                        <p className="text-sm text-[var(--c-accent)]">{statusMessage}</p>
                    )}
                </form>
                )}
            </div>
        </div>
    );
}
