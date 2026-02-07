import whatsapp from '../../images/whatsapp.svg'
import insta from '../../images/insta.svg'
import s from './Banner.module.scss'

const Banner = () => {
    return (
        <>
            <div className={s.banner}>
                <div className={s.title}>
                    <p>
                        Есть вопросы?
                    </p>
                    <p>
                        Бесплатная консультация в Ватсап!
                    </p>
                </div>
                <div className={s.icons}>
                    <a href="https://wa.me/77770978675" className={s.icon}><img src={whatsapp} alt="whatsapp link"/></a>
                    <a href="https://www.instagram.com/greenman_kazakstan/" className={s.icon}><img src={insta} alt="instagram link"/></a>
                </div>
                <a href="tel:+77770978675"  className={s.phone}>+7 777 097 8675</a>
                <div className={s.text}>Мы на связи каждый день с 9:00 до 18:00</div>

            </div>

        </>
    )
}

export default Banner
