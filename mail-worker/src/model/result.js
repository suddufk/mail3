import emailUtils from '../utils/email-utils';

const result = {
	ok(data) {
		const convertedData = emailUtils.convertEmailsToUnicode(data);
		return { code: 200, message: 'success', data: convertedData ? convertedData : null };
	},
	fail(message, code = 500) {
		return { code, message };
	}
};
export default result;
