#!/usr/bin/env python3
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LUTS_DIR = os.path.join(ROOT_DIR, "public", "luts")
os.makedirs(LUTS_DIR, exist_ok=True)

lut_profiles = [
    "Kodak_Vision3_500T_Cinema",
    "Teal_and_Orange_Hollywood_Blockbuster",
    "Golden_Hour_Sunset_Warmth",
    "Cyberpunk_Neon_Nights",
    "Fujifilm_Eterna_Pastel_Log",
    "Noir_Silver_Halide_High_Contrast",
    "Emerald_Matrix_Moody_Green",
    "Vintage_70s_Analog_Warmth",
    "Arri_Alexa_LogC_to_Rec709",
    "Sony_SLog3_Cinema_Profile",
    "Bleach_Bypass_Silver_Retention",
    "Technicolor_3Strip_Classic",
]

def generate_cube_lut(title: str, size: int = 33) -> str:
    lines = [
        f'TITLE "{title}"',
        f'LUT_3D_SIZE {size}',
        'DOMAIN_MIN 0.0 0.0 0.0',
        'DOMAIN_MAX 1.0 1.0 1.0',
        '# LuminaHDR Professional Cinematic Calibration Table',
    ]
    step = 1.0 / (size - 1)
    for b_idx in range(size):
        b = b_idx * step
        for g_idx in range(size):
            g = g_idx * step
            for r_idx in range(size):
                r = r_idx * step

                if "Kodak" in title:
                    rout = min(1.0, (r ** 0.94) * 1.05)
                    gout = min(1.0, g ** 0.98)
                    bout = min(1.0, (b ** 1.06) * 0.92)
                elif "Teal" in title:
                    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
                    shadow = max(0.0, 1.0 - luma * 1.8)
                    high = max(0.0, (luma - 0.35) * 1.5)
                    rout = min(1.0, max(0.0, r - shadow * 0.12 + high * 0.14))
                    gout = min(1.0, max(0.0, g + shadow * 0.04 + high * 0.03))
                    bout = min(1.0, max(0.0, b + shadow * 0.16 - high * 0.10))
                elif "Golden" in title:
                    rout = min(1.0, (r ** 0.92) * 1.14)
                    gout = min(1.0, (g ** 0.98) * 1.04)
                    bout = min(1.0, (b ** 1.15) * 0.82)
                elif "Cyberpunk" in title:
                    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
                    if luma < 0.5:
                        rout, gout, bout = r * 0.65, g * 1.15, b * 1.35
                    else:
                        rout, gout, bout = r * 1.35, g * 0.75, b * 1.25
                elif "Fuji" in title:
                    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
                    rout = min(1.0, r * 0.90 + 0.05)
                    gout = min(1.0, g * 0.92 + 0.04)
                    bout = min(1.0, b * 0.88 + 0.06)
                elif "Noir" in title:
                    luma = (0.299 * r + 0.587 * g + 0.114 * b) ** 1.25
                    rout = gout = bout = min(1.0, max(0.0, luma))
                else:
                    rout = min(1.0, r * 1.02)
                    gout = min(1.0, g * 1.01)
                    bout = min(1.0, b * 0.99)

                lines.append(f"{rout:.6f} {gout:.6f} {bout:.6f}")

    return "\n".join(lines) + "\n"

for p in lut_profiles:
    target_path = os.path.join(LUTS_DIR, f"{p}.cube")
    with open(target_path, "w") as fp:
        fp.write(generate_cube_lut(p))
print(f"Generated {len(lut_profiles)} 3D LUT profiles in {LUTS_DIR}")
