// Reading a user document without caring which half of the system wrote it.
//
// The mobile signup and this dashboard's register page grew up separately and
// disagree on two fields:
//
//   role         the app writes 'student', the dashboard wrote 'Student'
//   student type the app writes studentType: 'senior-high', the dashboard
//                wrote type: 'shs'
//
// Each page then filtered on whichever spelling it knew, so the student list
// could not see anyone who signed up in the app, and analytics counted zero
// students for anyone registered from the dashboard. Register now writes the
// app's shape, but documents in both shapes already exist and always will, so
// everything reads users through here.

// What a teacher is attached to. Teachers have no year, course or student
// number, so this and an employee number are all that stands in for the
// academic credentials a student carries.
export const DEPARTMENTS = ['Filipino', 'Social Science', 'ICT', 'Animation', 'P.E.', 'ABM', 'English', 'STEM', 'Science', 'Math', 'Business'];

/**
 * The user's role, lowercased and trimmed.
 * @param {any} user
 * @returns {string} 'student', 'teacher', 'admin', or '' if unset.
 */
export function normalizeRole(user) {
	const raw = user?.role;
	return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Title-cased role for display. */
export function roleLabel(user) {
	const role = normalizeRole(user);
	return role ? role[0].toUpperCase() + role.slice(1) : '';
}

/** True if the user holds the given role, whichever casing was stored. */
export function hasRole(user, role) {
	return normalizeRole(user) === String(role).trim().toLowerCase();
}

/**
 * Whether a student is in senior high or college.
 *
 * `studentType` is the app's field and wins when both are present; `type` is
 * the older dashboard field. 'shs' and 'senior-high' mean the same thing.
 *
 * @param {any} user
 * @returns {string} 'senior-high', 'college', or '' if unset.
 */
export function normalizeStudentType(user) {
	const raw = user?.studentType ?? user?.type;
	if (typeof raw !== 'string') return '';

	const text = raw.trim().toLowerCase();

	if (text === 'shs' || text === 'senior-high' || text === 'senior high') return 'senior-high';
	if (text === 'college') return 'college';

	return '';
}

/** Readable student type, or '' when the user is not a student. */
export function studentTypeLabel(user) {
	const type = normalizeStudentType(user);
	if (type === 'senior-high') return 'Senior High';
	if (type === 'college') return 'College';
	return '';
}

export function isSeniorHigh(user) {
	return normalizeStudentType(user) === 'senior-high';
}

export function isCollege(user) {
	return normalizeStudentType(user) === 'college';
}

/**
 * The user's surname. The app writes both lastName and surname; the dashboard
 * wrote only surname.
 * @param {any} user
 * @returns {string}
 */
export function surnameOf(user) {
	return (user?.surname || user?.lastName || '').trim();
}

/** Full name, skipping the parts that are missing. */
export function fullName(user) {
	return [user?.firstName, user?.middleName, surnameOf(user)]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ');
}

/** The interests a user chose at signup. */
export function userInterests(user) {
	if (!Array.isArray(user?.interests)) return [];
	return user.interests
		.filter((i) => typeof i === 'string' && i.trim())
		.map((i) => i.trim());
}

/** True if the user is a teacher. */
export function isTeacher(user) {
	return normalizeRole(user) === 'teacher';
}

/**
 * The identifying number for a user, whichever kind they are: a teacher's
 * employee number, a college student's number, a senior high learner's LRN.
 * @param {any} user
 * @returns {string}
 */
export function idNumberOf(user) {
	const raw = isTeacher(user)
		? user?.employeeNumber
		: isCollege(user)
			? user?.studentNumber
			: user?.lrn;

	return typeof raw === 'string' ? raw.trim() : '';
}
