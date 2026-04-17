import React from 'react';
import { Accordion, Anchor, Text, Title } from '@mantine/core';
import faqImage from '../../images/faq.png';

const faqData = [
    {
        question: 'В каком городе вы находитесь и как осуществляется доставка?',
        answer: 'Мы находимся в городе Петропавловск. Доставка осуществляется Казпочтой. В города Щучинск, Кокшетау, Астана, Костанай можем отправить посылочку InDrive.'
    },
    {
        question: 'Как узнать какой препарат мне подойдет?',
        answer: 'Нужно пройти полное обследование и получить диагноз у лечащего врача. После отправьте точный диагноз нашему консультанту, и он предложит вам курс лечения в ',
        linkText: 'WhatsApp',
        linkUrl: 'https://wa.me/77770978675/'
    },
    {
        question: 'Куда обратиться для личной консультации?',
        answer: 'Консультация проводится по ',
        linkText: 'WhatsApp',
        linkUrl: 'https://wa.me/77770978675/'
    },
    {
        question: 'Как оформить заказ на сайте?',
        answer: 'Нажмите на значок поиска, введите название нужного вам продукта или болезнь. Выберите нужный продукт, ознакомьтесь с описанием и противопоказаниями, добавьте в корзину. Заполните данные для доставки, выберите способы оплаты и доставки, нажмите «Оформить заказ». Вы получите счет на оплату в Kaspi. После оплаты на WhatsApp придёт трек-номер посылки и видеообзор.'
    },
    {
        question: 'Как происходит оплата?',
        answer: 'Оплата через Kaspi — мы выставляем счёт перед отправкой собранной посылки. Перед отправкой предоставляем видеообзор.'
    },
    {
        question: 'Сколько хранится ваша продукция?',
        answer: 'Продукция хранится в холодильнике в течение года.'
    }
];

const Faq = () => (
    <div style={{ marginTop: 48 }}>
        <Title order={3} ta="center" mb={4} style={{ color: '#00AB6D' }}>
            <span style={{ color: '#00AB6D' }}>FAQ</span>
        </Title>
        <Text ta="center" c="dimmed" mb={24} size="sm">
            Часто задаваемые вопросы
        </Text>
        <Accordion
            radius="lg"
            variant="separated"
            styles={{
                item: {
                    border: '1px solid rgba(0,171,109,0.15)',
                    background: '#fff'
                },
                control: { fontWeight: 600 },
                label: { color: '#1c3328' }
            }}
        >
            {faqData.map((item, index) => (
                <Accordion.Item key={index} value={String(index)}>
                    <Accordion.Control
                        icon={<img src={faqImage} alt="" style={{ width: 22, height: 22 }} />}
                    >
                        {item.question}
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Text size="sm" c="dimmed">
                            {item.answer}
                            {item.linkUrl && (
                                <Anchor href={item.linkUrl} target="_blank" c="greenman">
                                    {item.linkText}
                                </Anchor>
                            )}
                        </Text>
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion>
    </div>
);

export default Faq;
