import React, {useState} from 'react';
import faqImage from '../../images/faq.png';

const Faq = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const faqData = [
        {
            question: "В каком городе вы находитесь и в как осуществляется доставка?",
            answer: "Мы находимся в городе Петропавловск. Доставка осуществлятся казпочтой. В города Щучинск, Кокшетау, Астана, Костанай можем отправить посылочку индрайвером"
        },
        {
            question: "Как узнать какой препарат мне подойдет?",
            answer: "Нужно пройти полное обследование, и получить диагноз у лечащего врача. После, отправьте точный диагноз нашему консультанту, и он предложит вам курс лечения в ",
            linkText: "WhatsApp",
            linkUrl: "https://wa.me/77770978675/"
        },
        {
            question: "Куда обратиться для личной консультации?",
            answer: "Консультация проводится по ",
            linkText: "WhatsApp",
            linkUrl: "https://wa.me/77770978675/"
        },
        {
            question: "Как оформить заказ на сайте?",
            answer: "Можете нажать на значок поиска, ввести название нужного вам продукта, либо вашу болезнь. После этого вы перейдете в каталог. Выберите нужный вам продукт, внимательно ознакомьтесь с описанием, рекомендациями, противопоказаниями. После этого можете нажать в корзину, и выбрать вариант товара подходящий вам. После этого перейдите в корзину, заполните данные для доставки заказа, выберите способ оплаты, способ доставки, и нажмите 'Оформить заказ'. После этого вы получите счет на оплату в каспи. После оплаты вам на Ваш номер ватсап придет трек номер посылки и видеообзор."
        },
        {
            question: "Как происходит оплата?",
            answer: "Оплата происходит через Kaspi. Мы выставляем счет на оплату перед оправкой собранной посылки. Также перед отправкой предоставляем видеообзор собранной посылки. "
        },
        {
            question: "Сколько хранится ваша продукция?",
            answer: "Продукция хранится в холодильнике в течении года. "
        },

    ];

    const handleClick = index => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <>
            <div className="title__top">
                <span>FAQ</span>
            </div>
            <div className="subtitle__top">
                Часто задаваемые вопросы
            </div>
            <div className="faq">
                {faqData.map((item, index) => (
                    <div key={index} className="faq__item">
                        <div className="faq__question" onClick={() => handleClick(index)}>
                            <div className="faq__image">
                                <img src={faqImage} alt="FAQ"/>
                            </div>
                            <div className="faq__title">{item.question}</div>
                        </div>
                        {activeIndex === index && (
                            <div className="faq__answer">
                                {item.answer}
                                {item.linkUrl && (
                                    <a href={item.linkUrl} target="_blank">{item.linkText}</a>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

export default Faq;
