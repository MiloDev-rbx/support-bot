const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function bumpPatch(version) {
    const parts = version.split(".").map(part => Number.parseInt(part, 10));

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        throw new Error(`Version invalida: ${version}`);
    }

    const [major, minor, patch] = parts;
    return `${major}.${minor}.${patch + 1}`;
}

function bumpProjectVersion() {
    const packageJson = readJson(packageJsonPath);
    const currentVersion = packageJson.version || "0.0.0";
    const nextVersion = bumpPatch(currentVersion);

    packageJson.version = nextVersion;
    writeJson(packageJsonPath, packageJson);

    if (fs.existsSync(packageLockPath)) {
        const packageLock = readJson(packageLockPath);
        packageLock.version = nextVersion;

        if (packageLock.packages?.[""]) {
            packageLock.packages[""].version = nextVersion;
        }

        writeJson(packageLockPath, packageLock);
    }

    console.log(`Version actualizada: ${currentVersion} -> ${nextVersion}`);
    return nextVersion;
}

if (require.main === module) {
    bumpProjectVersion();
}

module.exports = {
    bumpProjectVersion
};
