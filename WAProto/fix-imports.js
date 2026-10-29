var import_fs = require("fs");
var import_process = require("process");
const filePath = "./index.js";
try {
  let content = (0, import_fs.readFileSync)(filePath, "utf8");
  content = content.replace(/import \* as (\$protobuf) from/g, "import $1 from");
  content = content.replace(/(['"])protobufjs\/minimal(['"])/g, "$1protobufjs/minimal.js$2");
  const marker = 'const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});\n\n';
  const longToStringHelper = `function longToString(value, unsigned) {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return String(value);
	}
	// Fast path: convert Long {low, high} directly via native BigInt
	// BigInt.toString() is a native C++ operation, much faster than Long's pure JS division loops
	if (value && typeof value.low === "number" && typeof value.high === "number") {
		const lo = BigInt(value.low >>> 0);
		const hi = BigInt(value.high >>> 0);
		const combined = (hi << 32n) | lo;
		if (!unsigned && value.high < 0) {
			return (combined - (1n << 64n)).toString();
		}
		return combined.toString();
	}
	return String(value);
}

`;
  const longToNumberHelper = 'function longToNumber(value, unsigned) {\n	if (typeof value === "number") {\n		return value;\n	}\n	if (typeof value === "string") {\n		return Number(value);\n	}\n	// Fast path: convert Long {low, high} directly via native BigInt\n	if (value && typeof value.low === "number" && typeof value.high === "number") {\n		const lo = BigInt(value.low >>> 0);\n		const hi = BigInt(value.high >>> 0);\n		const combined = (hi << 32n) | lo;\n		if (!unsigned && value.high < 0) {\n			return Number(combined - (1n << 64n));\n		}\n		return Number(combined);\n	}\n	return Number(value);\n}\n\n';
  if (!content.includes("function longToString(")) {
    const markerIndex = content.indexOf(marker);
    if (markerIndex === -1) {
      throw new Error("Unable to inject Long helpers: marker not found in WAProto index output");
    }
    content = content.replace(marker, `${marker}${longToStringHelper}${longToNumberHelper}`);
  } else {
    const longToStringRegex = /function longToString\(value, unsigned\) {\n[\s\S]*?\n}\n\n/;
    const longToNumberRegex = /function longToNumber\(value, unsigned\) {\n[\s\S]*?\n}\n\n/;
    if (!longToStringRegex.test(content) || !longToNumberRegex.test(content)) {
      throw new Error("Unable to update Long helpers: existing definitions not found");
    }
    content = content.replace(longToStringRegex, longToStringHelper);
    content = content.replace(longToNumberRegex, longToNumberHelper);
  }
  const longPattern = /([ \t]+d\.(\w+) = )o\.longs === String \? \$util\.Long\.prototype\.toString\.call\(m\.\2\) : o\.longs === Number \? new \$util\.LongBits\(m\.\2\.low >>> 0, m\.\2\.high >>> 0\)\.toNumber\((true)?\) : m\.\2;/g;
  content = content.replace(longPattern, (_match, prefix, field, unsignedFlag) => {
    const unsignedArg = unsignedFlag ? ", true" : "";
    return `${prefix}o.longs === String ? longToString(m.${field}${unsignedArg}) : o.longs === Number ? longToNumber(m.${field}${unsignedArg}) : m.${field};`;
  });
  (0, import_fs.writeFileSync)(filePath, content, "utf8");
  console.log(`\u2705 Fixed imports in ${filePath}`);
} catch (error) {
  console.error(`\u274C Error fixing imports: ${error.message}`);
  (0, import_process.exit)(1);
}
