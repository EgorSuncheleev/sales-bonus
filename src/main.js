/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(item, product) {
  // Расчет выручки: (цена продажи - скидка) * количество

  const discount = 1 - item.discount / 100;

  const priceWithDiscount = item.sale_price * discount;

  return priceWithDiscount * item.quantity;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;

  if (index === 0) {
    return profit * 0.15; // Первое место
  }

  if (index === 1 || index === 2) {
    return profit * 0.1; // Второе и третье место
  }

  if (index === total - 1) {
    return 0; // последнее место
  }

  //   Все остальные кроме последнего места
  return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных

  const isNotArrayCondition =
    !Array.isArray(data?.sellers) ||
    !Array.isArray(data?.products) ||
    !Array.isArray(data?.purchase_records) ||
    !Array.isArray(data?.customers);

  const isNotNullCollectionCondition =
    !data?.sellers?.length ||
    !data?.products?.length ||
    !data?.purchase_records?.length ||
    !data?.customers?.length;

  if (!data || isNotArrayCondition || isNotNullCollectionCondition) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций

  if (!options || typeof options !== "object") {
    throw new Error("Чего-то не хватает");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Некорректные опции");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    sales_count: 0, // кол-во продаж
    profit: 0, // прибыль от продаж продавца
    revenue: 0, // Общая выручка с учетом скидок
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  console.log(sellerStats);

  // @TODO: Расчет выручки и прибыли для каждого продавца

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id]; // Продавец

    sellerStats.forEach((currentSeller) => {
      if (currentSeller.id === seller.id) {
        // Общее кол-во продаж продавца
        currentSeller.sales_count++;
        // Общая сумма чека продавца.
        currentSeller.revenue += record.total_amount;
      }
    });

    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар

      // Посчитать себестоимость товара
      const cost = product.purchase_price * item.quantity;

      // Посчитать выручку с учётом скидки через функцию calculateRevenue
      const revenue = calculateSimpleRevenue(item, product);

      // Посчитать прибыль: выручка минус себестоимость
      const itemProfit = revenue - cost;

      // Увеличить общую накопленную прибыль у продавца
      seller.profit += itemProfit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // Преобразуем объект в массив вида ["SKU_001": 10, "SKU_002": 20], сортируем в порядке убывания и преобразуем в массив вида [{SKU_001: 10}, {SKU_002: 20}]
    const transformedProducts = Object.entries(seller.products_sold)
      .sort((a, b) => b[1] - a[1])
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }));

    // Отделяем топ 10 продаваемых товаров
    seller.top_products = transformedProducts.slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  const result = sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    // Округляем до 2 знаков после запятой
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));

  return result;
}
