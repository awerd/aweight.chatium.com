function calcBMI(height, weight) {
  return height === 0
    ? null
    : Math.round(weight / Math.pow(height / 100, 2) * 100) / 100
}

function getBMIDescription(BMI) {
  return BMI > 40
    ? 'Ожирение III степени'
    : BMI > 35
      ? 'Ожирение II степени'
      : BMI > 30
        ? 'Ожирение I степени'
        : BMI > 25
          ? 'Избыточный вес (предожирение)'
          : BMI > 18.5
            ? 'Нормальный вес'
            : BMI > 16
              ? 'Ниже нормального веса'
              : 'Дистрофия'
}

function getBMIColor(BMI) {
  if (BMI <= 16 || BMI > 30) return 'red'
  if ((BMI > 16 && BMI <= 18.5) || (BMI > 25 && BMI <= 30)) return '#9c9c00'
  return 'green'
}

module.exports = {
  calcBMI,
  getBMIDescription,
  getBMIColor,
}
