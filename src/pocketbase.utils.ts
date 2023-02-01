// ty tajkirkpatrick's pocketbase adapter implementation.
const PB_RECORD_KEYS = [
  "created",
  "updated",
  "clone",
  "code",
  "collectionId",
  "collectionName",
  "expand",
  "export",
  "isNew",
  "load",
];

function isDate(date: any) {
  return (
    new Date(date).toString() !== "Invalid Date" && !isNaN(Date.parse(date))
  );
}

export function format<TAdapterType>(obj: Record<string, any>): TAdapterType {
  for (const [key, value] of Object.entries(obj)) {
    if (isDate(value)) {
      obj[key] = new Date(value);
    }

    if (PB_RECORD_KEYS.includes(key)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete obj[key];
    }
  }

  return obj as TAdapterType;
}