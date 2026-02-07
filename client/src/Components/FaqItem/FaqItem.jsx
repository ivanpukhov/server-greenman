import React, { useState } from 'react';

const FaqItem = ({ question, answer, imageUrl }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="faq">
            <div className="faq__item">
                <div className="faq__question" onClick={toggleOpen}>
                    {imageUrl && (
                        <div className="faq__image">
                            <img src={imageUrl} alt="FAQ" />
                        </div>
                    )}
                    <div className="faq__title">{question}</div>
                </div>
                {isOpen && (
                    <div className="faq__answer">
                        {answer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaqItem;
