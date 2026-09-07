// Program and department to subject mappings, read from Firestore.
//
// Ported from the mobile app. The only change is the Firebase call style: the
// app uses the NativeScript plugin's namespaced API, the web uses the modular
// SDK. The caching and matching behaviour is the same.

import { collection, getDocs } from 'firebase/firestore';
import { db } from '$lib/firebase';

let programMappingsCache = null;
let departmentMappingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function readMappings(snapshot, nameField) {
	const mappings = {};
	snapshot.forEach((doc) => {
		const data = doc.data();
		if (data[nameField] && data.subjects) {
			mappings[String(data[nameField]).trim().toUpperCase()] = data.subjects;
		}
	});
	return mappings;
}

function fresh() {
	return cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION;
}

export async function fetchProgramMappings() {
	try {
		if (programMappingsCache && fresh()) return programMappingsCache;

		const snapshot = await getDocs(collection(db, 'programMappings'));
		programMappingsCache = readMappings(snapshot, 'name');
		cacheTimestamp = Date.now();
		return programMappingsCache;
	} catch (error) {
		console.error('Error fetching program mappings:', error);
		return {};
	}
}

export async function fetchDepartmentMappings() {
	try {
		if (departmentMappingsCache && fresh()) return departmentMappingsCache;

		const snapshot = await getDocs(collection(db, 'departmentMappings'));
		departmentMappingsCache = readMappings(snapshot, 'department');
		cacheTimestamp = Date.now();
		return departmentMappingsCache;
	} catch (error) {
		console.error('Error fetching department mappings:', error);
		return {};
	}
}

/** Exact match first, then a loose one, so "BS Computer Science" finds "BSCS". */
function matchMapping(mappings, text) {
	if (mappings[text]) return mappings[text];

	for (const [key, subjects] of Object.entries(mappings)) {
		if (text.includes(key) || key.includes(text)) return subjects;
	}

	return [];
}

export async function getSubjectsForProgram(track) {
	if (typeof track !== 'string' || !track.trim()) return [];
	// The app re-queried Firestore here instead of using its own cache; this
	// goes through the cache, which is what the cache was written for.
	return matchMapping(await fetchProgramMappings(), track.trim().toUpperCase());
}

export async function getSubjectsForDepartment(department) {
	if (typeof department !== 'string' || !department.trim()) return [];
	return matchMapping(await fetchDepartmentMappings(), department.trim().toUpperCase());
}

export function clearMappingCache() {
	programMappingsCache = null;
	departmentMappingsCache = null;
	cacheTimestamp = null;
}
