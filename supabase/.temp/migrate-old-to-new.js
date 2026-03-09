const { createClient } = require("@supabase/supabase-js");

const required = ["OLD_URL", "OLD_SERVICE_ROLE", "NEW_URL", "NEW_SERVICE_ROLE"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const oldClient = createClient(process.env.OLD_URL, process.env.OLD_SERVICE_ROLE, {
  auth: { persistSession: false },
});
const newClient = createClient(process.env.NEW_URL, process.env.NEW_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const TABLES = [
  "blog_queue",
  "blogs",
  "button_routes",
  "contact_info",
  "enrollments",
  "faqs",
  "footer_links",
  "footer_sections",
  "header_contacts",
  "header_links",
  "hero_slides",
  "leads",
  "page_content",
  "programs",
  "seo_settings",
  "site_settings",
  "social_links",
  "stats",
  "students",
  "testimonials",
  "trainers",
  "user_roles",
];

// Child tables first to avoid FK errors during delete.
const DELETE_ORDER = [
  "blog_queue",
  "enrollments",
  "footer_links",
  "user_roles",
  "students",
  "trainers",
  "testimonials",
  "leads",
  "hero_slides",
  "button_routes",
  "faqs",
  "stats",
  "social_links",
  "contact_info",
  "site_settings",
  "seo_settings",
  "page_content",
  "header_contacts",
  "header_links",
  "footer_sections",
  "blogs",
  "programs",
];

// Parent tables first to avoid FK errors during insert.
const INSERT_ORDER = [
  "programs",
  "blogs",
  "footer_sections",
  "header_links",
  "header_contacts",
  "site_settings",
  "contact_info",
  "social_links",
  "stats",
  "faqs",
  "button_routes",
  "hero_slides",
  "page_content",
  "testimonials",
  "trainers",
  "students",
  "leads",
  "seo_settings",
  "enrollments",
  "footer_links",
  "blog_queue",
  "user_roles",
];

const CHUNK = 500;

async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const to = from + step - 1;
    const { data, error } = await client.from(table).select("*").range(from, to);
    if (error) throw new Error(`[${table}] fetch failed: ${error.message}`);
    rows.push(...data);
    if (data.length < step) break;
    from += step;
  }

  return rows;
}

async function countRows(client, table) {
  const { count, error } = await client.from(table).select("*", { head: true, count: "exact" });
  if (error) throw new Error(`[${table}] count failed: ${error.message}`);
  return count ?? 0;
}

async function clearTable(client, table) {
  const { error } = await client.from(table).delete().not("id", "is", null);
  if (error) throw new Error(`[${table}] clear failed: ${error.message}`);
}

async function insertRows(client, table, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await client.from(table).insert(chunk);
    if (error) {
      throw new Error(`[${table}] insert failed at chunk ${i / CHUNK + 1}: ${error.message}`);
    }
  }
}

async function migrateTables() {
  console.log("== TABLE DATA MIGRATION ==");

  const sourceCounts = {};
  for (const table of TABLES) {
    sourceCounts[table] = await countRows(oldClient, table);
    console.log(`source ${table}: ${sourceCounts[table]}`);
  }

  for (const table of DELETE_ORDER) {
    await clearTable(newClient, table);
    console.log(`cleared target ${table}`);
  }

  const failures = [];
  for (const table of INSERT_ORDER) {
    const rows = await fetchAllRows(oldClient, table);
    if (rows.length === 0) {
      console.log(`skip ${table}: 0 rows`);
      continue;
    }

    try {
      await insertRows(newClient, table, rows);
      console.log(`copied ${table}: ${rows.length}`);
    } catch (err) {
      failures.push({ table, error: err.message });
      console.error(err.message);
    }
  }

  console.log("== TABLE COUNT VERIFY ==");
  for (const table of TABLES) {
    const source = sourceCounts[table];
    const target = await countRows(newClient, table);
    const ok = source === target ? "OK" : "MISMATCH";
    console.log(`${ok} ${table}: old=${source}, new=${target}`);
  }

  if (failures.length) {
    console.log("== TABLE FAILURES ==");
    for (const f of failures) console.log(`${f.table}: ${f.error}`);
  }
}

async function listAllFiles(bucket) {
  const files = [];
  const queue = [""];

  while (queue.length) {
    const prefix = queue.shift();
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data, error } = await oldClient.storage.from(bucket).list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`[storage:${bucket}] list failed at "${prefix}": ${error.message}`);
      if (!data || data.length === 0) break;

      for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) {
          files.push(fullPath);
        } else {
          queue.push(fullPath);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  return files;
}

async function migrateStorage() {
  console.log("== STORAGE MIGRATION ==");
  const { data: oldBuckets, error: oldBucketsError } = await oldClient.storage.listBuckets();
  if (oldBucketsError) throw new Error(`list old buckets failed: ${oldBucketsError.message}`);

  const { data: newBuckets, error: newBucketsError } = await newClient.storage.listBuckets();
  if (newBucketsError) throw new Error(`list new buckets failed: ${newBucketsError.message}`);

  const newByName = new Map((newBuckets || []).map((b) => [b.name, b]));
  console.log(`old buckets: ${(oldBuckets || []).length}`);
  console.log(`new buckets: ${(newBuckets || []).length}`);

  for (const bucket of oldBuckets || []) {
    if (!newByName.has(bucket.name)) {
      const { error } = await newClient.storage.createBucket(bucket.name, {
        public: !!bucket.public,
        fileSizeLimit: bucket.file_size_limit || undefined,
        allowedMimeTypes: bucket.allowed_mime_types || undefined,
      });
      if (error) throw new Error(`create bucket "${bucket.name}" failed: ${error.message}`);
      console.log(`created bucket ${bucket.name}`);
    } else {
      console.log(`bucket exists ${bucket.name}`);
    }

    const files = await listAllFiles(bucket.name);
    console.log(`bucket ${bucket.name}: ${files.length} files`);

    for (const filePath of files) {
      const { data: fileData, error: downloadError } = await oldClient.storage
        .from(bucket.name)
        .download(filePath);
      if (downloadError) {
        console.error(`[storage:${bucket.name}] download failed ${filePath}: ${downloadError.message}`);
        continue;
      }

      const body =
        fileData && typeof fileData.arrayBuffer === "function"
          ? Buffer.from(await fileData.arrayBuffer())
          : fileData;

      const { error: uploadError } = await newClient.storage.from(bucket.name).upload(filePath, body, {
        upsert: true,
        contentType: fileData?.type || undefined,
      });
      if (uploadError) {
        console.error(`[storage:${bucket.name}] upload failed ${filePath}: ${uploadError.message}`);
      } else {
        console.log(`[storage:${bucket.name}] copied ${filePath}`);
      }
    }
  }
}

async function main() {
  await migrateTables();
  await migrateStorage();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
