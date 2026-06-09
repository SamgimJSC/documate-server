// 영문과 숫자를 반드시 각각 1개 이상 포함하고, 8~20자 길이
export const rPassword = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/;

export const rNickname = /^[A-Za-z가-힣]{2,8}$/;
