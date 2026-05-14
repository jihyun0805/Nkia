type ContactValidationInput = {
  name?: string | null
  email?: string | null
  mobilePhone?: string | null
  landlinePhone?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_ALLOWED_PATTERN = /^[0-9+\-\s()]+$/
const PHONE_DIGIT_MIN = 8
const PHONE_DIGIT_MAX = 15

function trimValue(value: string | null | undefined) {
  return String(value ?? "").trim()
}

function validatePhoneInput(value: string, label: string) {
  if (!value) return null

  if (!PHONE_ALLOWED_PATTERN.test(value)) {
    return `${label}는 숫자와 +, -, 공백, 괄호만 입력할 수 있습니다.`
  }

  const digitCount = value.replace(/\D/g, "").length
  if (digitCount < PHONE_DIGIT_MIN || digitCount > PHONE_DIGIT_MAX) {
    return `${label}는 숫자 ${PHONE_DIGIT_MIN}~${PHONE_DIGIT_MAX}자리로 입력해주십시오.`
  }

  return null
}

export function validateManagerContacts(contacts: ContactValidationInput[]) {
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index]
    const label = `담당자 ${index + 1}`
    const name = trimValue(contact.name)
    const email = trimValue(contact.email)
    const mobilePhone = trimValue(contact.mobilePhone)
    const landlinePhone = trimValue(contact.landlinePhone)

    if (!name) {
      return `${label}의 성명을 입력해주십시오.`
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      return `${label}의 이메일 형식이 올바르지 않습니다.`
    }

    const mobilePhoneError = validatePhoneInput(mobilePhone, `${label}의 무선전화번호`)
    if (mobilePhoneError) return mobilePhoneError

    const landlinePhoneError = validatePhoneInput(landlinePhone, `${label}의 유선전화번호`)
    if (landlinePhoneError) return landlinePhoneError
  }

  return null
}
