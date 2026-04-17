import React from 'react';
import { Accordion, Group, Text } from '@mantine/core';

const FaqItem = ({ question, answer, icon: Icon }) => (
    <Accordion
        radius="lg"
        variant="separated"
        chevronPosition="right"
        styles={{
            item: {
                border: '1px solid var(--mantine-color-gray-2)',
                background: '#fff',
            },
            control: { fontWeight: 600 },
            label: { color: '#0b1712' },
        }}
    >
        <Accordion.Item value="item">
            <Accordion.Control
                icon={Icon ? <Icon size={20} stroke={1.7} color="var(--mantine-color-greenman-7)" /> : null}
            >
                {question}
            </Accordion.Control>
            <Accordion.Panel>
                <Text size="sm" c="dimmed" lh={1.6} style={{ whiteSpace: 'pre-line' }}>
                    {answer}
                </Text>
            </Accordion.Panel>
        </Accordion.Item>
    </Accordion>
);

export default FaqItem;
