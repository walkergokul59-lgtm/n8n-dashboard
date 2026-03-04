import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ImagePlus, Save } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_PROFILE_IMAGE_DIMENSION = 384;
const PROFILE_IMAGE_QUALITY = 0.82;

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
    const { dataSource, setDataSource, clientProfile, setClientProfile } = useSettings();
    const [formData, setFormData] = useState(clientProfile);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        setDataSource("n8n-server");
    }, [setDataSource]);

    useEffect(() => {
        setFormData(clientProfile);
    }, [clientProfile]);

    const isFormValid = useMemo(() => (
        Boolean(formData.clientName.trim())
        && Boolean(formData.contactNumber.trim())
        && Boolean(formData.businessName.trim())
        && Boolean(formData.primaryEmail.trim())
        && Boolean(formData.secondaryEmail.trim())
        && Boolean(formData.profileImage)
    ), [formData]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setStatusMessage("");
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleImageChange = async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;

        setStatusMessage("");

        if (!file.type.startsWith("image/")) {
            setStatusMessage("Please upload a valid image file.");
            return;
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setStatusMessage("Image is too large. Please upload an image smaller than 8 MB.");
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

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!isFormValid) {
            setStatusMessage("Please complete all mandatory profile fields before saving.");
            return;
        }

        const sanitizedProfile = {
            clientName: formData.clientName.trim(),
            contactNumber: formData.contactNumber.trim(),
            businessName: formData.businessName.trim(),
            primaryEmail: formData.primaryEmail.trim(),
            secondaryEmail: formData.secondaryEmail.trim(),
            profileImage: formData.profileImage,
        };

        try {
            setClientProfile(sanitizedProfile);
            setStatusMessage("Profile details saved successfully.");
        } catch (error) {
            if (isQuotaExceededError(error)) {
                setStatusMessage("Browser storage is full. Use a smaller image and try again.");
                return;
            }
            setStatusMessage("Could not save profile details. Please try again.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
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

            <div className="rounded-xl border border-[var(--c-border-light)] bg-[var(--c-surface)]/70 overflow-hidden">
                <div className="border-b border-[var(--c-border-light)] px-6 py-5">
                    <h3 className="text-lg font-bold text-[var(--c-text)]">Client Profile Details</h3>
                    <p className="text-sm text-gray-400">All fields below are mandatory. Saved profile image appears in the top-right header.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Client Name *</span>
                            <input
                                type="text"
                                name="clientName"
                                required
                                value={formData.clientName}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                placeholder="Enter client name"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Contact Number *</span>
                            <input
                                type="tel"
                                name="contactNumber"
                                required
                                value={formData.contactNumber}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                placeholder="+1 000 000 0000"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Business Name *</span>
                            <input
                                type="text"
                                name="businessName"
                                required
                                value={formData.businessName}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                placeholder="Enter business name"
                            />
                        </label>

                        <label className="space-y-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Primary Email *</span>
                            <input
                                type="email"
                                name="primaryEmail"
                                required
                                value={formData.primaryEmail}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                placeholder="primary@business.com"
                            />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                            <span className="text-sm font-medium text-[var(--c-text-dim)]">Secondary Email *</span>
                            <input
                                type="email"
                                name="secondaryEmail"
                                required
                                value={formData.secondaryEmail}
                                onChange={handleInputChange}
                                className="w-full rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] px-3 py-2.5 text-sm text-[var(--c-text)] outline-none focus:border-[#00d9ff]/80"
                                placeholder="support@business.com"
                            />
                        </label>
                    </div>

                    <div className="rounded-lg border border-[var(--c-border-light)] bg-[var(--c-bg)] p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-[var(--c-hover)] flex items-center justify-center">
                                {formData.profileImage ? (
                                    <img src={formData.profileImage} alt="Client profile" className="h-full w-full object-cover" />
                                ) : (
                                    <ImagePlus size={20} className="text-gray-400" />
                                )}
                            </div>

                            <label className="space-y-2 flex-1 min-w-[240px]">
                                <span className="text-sm font-medium text-[var(--c-text-dim)]">Profile Image *</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    required={!formData.profileImage}
                                    className="block w-full cursor-pointer rounded-lg border border-[var(--c-border-light)] bg-[var(--c-surface)] px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-[#00d9ff]/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#7cf3ff]"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-gray-500">Mandatory fields are marked with *</p>
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-lg bg-[#00d9ff] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] transition hover:bg-[#28e0ff] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!isFormValid}
                        >
                            <Save size={16} className="mr-2" />
                            Save Profile
                        </button>
                    </div>

                    {statusMessage && (
                        <p className="text-sm text-[#7cf3ff]">{statusMessage}</p>
                    )}
                </form>
            </div>
        </div>
    );
}
