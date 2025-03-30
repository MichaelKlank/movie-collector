export default {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    extensionsToTreatAsEsm: [".ts", ".tsx"],
    moduleFileExtensions: ["ts", ".tsx", ".js", ".jsx", ".json", ".node"],
    testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
    globals: {
        "ts-jest": {
            useESM: true,
        },
    },
};
